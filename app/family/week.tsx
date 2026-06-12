import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import {
  CalendarEvent,
  CalendarViewMode,
  filterEventsByViewMode,
  getDateKey,
  getLocalDateKey,
  getParticipantLabel,
  loadFamilyCalendarEvents,
  Profile,
} from '../../lib/familyCalendar';

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return start;
}

function getWeekEnd(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);

    return day;
  });
}

export default function WeekScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('family');
  const [viewDate, setViewDate] = useState(() =>
    date ? new Date(`${date}T12:00:00`) : new Date()
  );

  const weekStart = useMemo(() => getWeekStart(viewDate), [viewDate]);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  useEffect(() => {
    loadEvents();
  }, [weekStart.getTime()]);

  async function loadEvents() {
    setLoading(true);

    const calendarData = await loadFamilyCalendarEvents({
      start: weekStart,
      end: weekEnd,
    });

    setEvents(calendarData.events);
    setProfiles(calendarData.profiles);
    setFamilyMemberIds(calendarData.familyMemberIds);
    setCurrentUserId(calendarData.currentUserId);
    setLoading(false);
  }

  const visibleEvents = useMemo(
    () => filterEventsByViewMode(events, viewMode, currentUserId),
    [currentUserId, events, viewMode]
  );

  const grouped = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    visibleEvents.forEach((event) => {
      const key = getLocalDateKey(event.starts_at);

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(event);
    });

    return map;
  }, [visibleEvents]);

  function goToPreviousWeek() {
    const previous = new Date(weekStart);
    previous.setDate(previous.getDate() - 7);
    setViewDate(previous);
  }

  function goToNextWeek() {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setViewDate(next);
  }

  const selectedDateKey = getDateKey(viewDate);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <Text style={styles.navButton} onPress={goToPreviousWeek}>
          ‹
        </Text>

        <Text style={styles.title}>
          {weekStart.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })}
          {' - '}
          {weekEnd.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.navButton} onPress={goToNextWeek}>
          ›
        </Text>
      </View>

      <View style={styles.switchRow}>
        {(['family', 'mine'] as CalendarViewMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.switchButton,
              viewMode === mode && styles.switchButtonActive,
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.switchText,
                viewMode === mode && styles.switchTextActive,
              ]}
            >
              {mode === 'family' ? 'Family' : 'Mine'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.viewRow}>
        <Text
          style={styles.viewTab}
          onPress={() =>
            router.push({
              pathname: '/family/month',
              params: { date: selectedDateKey },
            })
          }
        >
          Month
        </Text>
        <Text style={[styles.viewTab, styles.viewTabActive]}>
          Week
        </Text>
        <Text
          style={styles.viewTab}
          onPress={() =>
            router.push({
              pathname: '/family/day',
              params: { date: selectedDateKey },
            })
          }
        >
          Day
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.weekList}>
        {weekDays.map((day) => {
          const dayKey = getDateKey(day);
          const dayEvents = grouped[dayKey] || [];

          return (
            <View key={dayKey} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/family/day',
                      params: { date: dayKey },
                    })
                  }
                >
                  <Text style={styles.dayTitle}>
                    {day.toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </Pressable>

                <Text
                  style={styles.dayAdd}
                  onPress={() =>
                    router.push({
                      pathname: '/family/create-event',
                      params: { date: dayKey },
                    })
                  }
                >
                  ＋
                </Text>
              </View>

              {dayEvents.length === 0 ? (
                <Text style={styles.emptyText}>No events</Text>
              ) : (
                dayEvents.map((event) => {
                  const assignedUserId =
                    event.event_participants?.[0]?.user_id;
                  const assignedProfile = assignedUserId
                    ? profiles[assignedUserId]
                    : null;

                  return (
                    <Pressable
                      key={event.id}
                      style={styles.eventRow}
                      onPress={() =>
                        router.push(`/family/event?id=${event.id}`)
                      }
                    >
                      <Text
                        style={[
                          styles.eventTitle,
                          {
                            color:
                              assignedProfile?.avatar_color || '#333',
                          },
                        ]}
                      >
                        {new Date(event.starts_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        {event.title}
                      </Text>

                      <Text style={styles.eventMeta} numberOfLines={1}>
                        {getParticipantLabel(
                          event,
                          profiles,
                          familyMemberIds
                        )}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/family/create-event',
            params: { date: selectedDateKey },
          })
        }
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: 'black',
  },
  switchText: {
    color: '#333',
    fontWeight: '600',
  },
  switchTextActive: {
    color: 'white',
  },
  viewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  viewTab: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    color: '#333',
    fontWeight: '600',
  },
  viewTabActive: {
    backgroundColor: '#e8eeff',
    color: '#4c7dff',
  },
  weekList: {
    gap: 12,
    paddingBottom: 110,
  },
  daySection: {
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    padding: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dayAdd: {
    width: 34,
    height: 34,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'black',
    color: 'white',
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 31,
  },
  emptyText: {
    color: '#666',
  },
  eventRow: {
    paddingVertical: 8,
  },
  eventTitle: {
    fontWeight: '700',
  },
  eventMeta: {
    color: '#666',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: 'white',
    fontSize: 34,
    lineHeight: 36,
  },
});
