import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Menu, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Assignment, StudentAssignment, Class } from '../../types/database.types';
import { useState, useMemo } from 'react';

interface AssignmentWithStatus extends Assignment {
  student_assignment_status?: 'not_started' | 'in_progress' | 'completed' | 'retake';
  latest_score?: number;
  class_name?: string;
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const studentId = useAuthStore((state) => state.studentId);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'created' | 'status'>('due_date');
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [classMenuVisible, setClassMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ['assignments', studentId],
    queryFn: async () => {
      // Get assignments with class information
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          assignment_students!inner(student_id),
          classes(name)
        `)
        .eq('assignment_students.student_id', studentId)
        .eq('status', 'published');

      if (assignmentsError) throw assignmentsError;

      // Get student_assignments status
      const { data: studentAssignments, error: statusError } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', studentId);

      if (statusError) throw statusError;

      // Merge status and class name into assignments
      const assignmentsWithStatus: AssignmentWithStatus[] = (assignmentsData || []).map((assignment: any) => {
        const studentAssignment = studentAssignments?.find(sa => sa.assignment_id === assignment.id);
        return {
          ...assignment,
          student_assignment_status: studentAssignment?.status || 'not_started',
          latest_score: studentAssignment?.latest_score,
          class_name: assignment.classes?.name || 'Unknown',
        };
      });

      return assignmentsWithStatus;
    },
    enabled: !!studentId,
  });

  // Get unique classes for filter
  const classes = useMemo(() => {
    if (!assignments) return [];
    const uniqueClasses = [...new Set(assignments.map(a => a.class_name))];
    return uniqueClasses.filter(Boolean);
  }, [assignments]);

  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    if (!assignments) return [];

    let filtered = [...assignments];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.student_assignment_status === statusFilter);
    }

    // Apply class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(a => a.class_name === classFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'status') {
        const statusOrder = { 'in_progress': 0, 'not_started': 1, 'retake': 2, 'completed': 3 };
        const aOrder = statusOrder[a.student_assignment_status || 'not_started'];
        const bOrder = statusOrder[b.student_assignment_status || 'not_started'];
        return aOrder - bOrder;
      }
      return 0;
    });

    return filtered;
  }, [assignments, statusFilter, classFilter, sortBy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'retake':
        return '#2196f3';
      case 'in_progress':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'retake':
        return 'Retake';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const renderAssignment = ({ item }: { item: AssignmentWithStatus }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/assignment/${item.id}`)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.title}>
            {item.title}
          </Text>
          <View style={styles.statusContainer}>
            <Chip
              style={{ backgroundColor: getStatusColor(item.student_assignment_status || 'not_started') }}
              textStyle={{ color: '#fff' }}
            >
              {getStatusLabel(item.student_assignment_status || 'not_started')}
            </Chip>
            {item.latest_score !== null && item.latest_score !== undefined && (
              <Text variant="labelSmall" style={styles.scoreText}>
                {item.latest_score.toFixed(0)}%
              </Text>
            )}
          </View>
        </View>

        {item.description && (
          <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.due_date && (
          <Text variant="bodySmall" style={styles.dueDate}>
            Due: {new Date(item.due_date).toLocaleDateString()}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading assignments...</Text>
      </View>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="titleMedium" style={styles.emptyText}>
          No assignments yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Your teacher will assign reading materials soon
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter and Sort Controls */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {/* Status Filter */}
          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setStatusMenuVisible(true)}
                style={styles.filterButton}
                compact
              >
                {statusFilter === 'all' ? 'All Status' : getStatusLabel(statusFilter)}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setStatusFilter('all'); setStatusMenuVisible(false); }} title="All Status" />
            <Menu.Item onPress={() => { setStatusFilter('not_started'); setStatusMenuVisible(false); }} title="Not Started" />
            <Menu.Item onPress={() => { setStatusFilter('in_progress'); setStatusMenuVisible(false); }} title="In Progress" />
            <Menu.Item onPress={() => { setStatusFilter('retake'); setStatusMenuVisible(false); }} title="Retake" />
            <Menu.Item onPress={() => { setStatusFilter('completed'); setStatusMenuVisible(false); }} title="Completed" />
          </Menu>

          {/* Class Filter */}
          {classes.length > 1 && (
            <Menu
              visible={classMenuVisible}
              onDismiss={() => setClassMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setClassMenuVisible(true)}
                  style={styles.filterButton}
                  compact
                >
                  {classFilter === 'all' ? 'All Classes' : classFilter}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setClassFilter('all'); setClassMenuVisible(false); }} title="All Classes" />
              {classes.map(className => (
                <Menu.Item
                  key={className}
                  onPress={() => { setClassFilter(className!); setClassMenuVisible(false); }}
                  title={className!}
                />
              ))}
            </Menu>
          )}

          {/* Sort Menu */}
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setSortMenuVisible(true)}
                style={styles.filterButton}
                compact
              >
                Sort: {sortBy === 'due_date' ? 'Due Date' : sortBy === 'created' ? 'Newest' : 'Status'}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setSortBy('due_date'); setSortMenuVisible(false); }} title="Due Date" />
            <Menu.Item onPress={() => { setSortBy('created'); setSortMenuVisible(false); }} title="Newest First" />
            <Menu.Item onPress={() => { setSortBy('status'); setSortMenuVisible(false); }} title="By Status" />
          </Menu>
        </View>

        {/* Results count */}
        <Text variant="bodySmall" style={styles.resultsText}>
          {filteredAndSortedAssignments.length} assignment{filteredAndSortedAssignments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredAndSortedAssignments}
        renderItem={renderAssignment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              No assignments match your filters
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    minWidth: 100,
  },
  resultsText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    marginTop: 4,
    fontWeight: '600',
    color: '#666',
  },
  description: {
    color: '#666',
    marginBottom: 8,
  },
  dueDate: {
    color: '#999',
  },
  emptyText: {
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
  },
});
