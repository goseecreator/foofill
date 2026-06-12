import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
  getParticipantLabel,
  getParticipantProfiles,
  loadFamilyCalendarEvents,
  Profile,
} from '../../lib/familyCalendar';

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('family');

  useEffect(() => {
    if (date) {
      loadEvents();
    }
  }, [date]);

  async function loadEvents() {
    setLoading(true);

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    const calendarData = await loadFamilyCalendarEvents({
      start,
      end,
    });

    setEvents(calendarData.events);
    setProfiles(calendarData.profiles);
    setFamilyMemberIds(calendarData.familyMemberIds);
    setCurrentUserId(calendarData.currentUserId);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const now = new Date();

  const todayKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(
    2,
    '0'
  )}`;

  const isToday = date === todayKey;
  const visibleEvents = filterEventsByViewMode(
    events,
    viewMode,
    currentUserId
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          isToday && styles.todayTitle,
        ]}
      >
        {isToday ? 'Today' : new Date(`${date}T12:00:00`).toDateString()}
      </Text>

      <View style={styles.switchRow}>
        {(['family', 'mine'] as CalendarViewMode[]).map((mode) => (
          <TouchableOpacity
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
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.viewRow}>
        <Text
          style={styles.viewTab}
          onPress={() =>
            router.push({
              pathname: '/family/month',
              params: { date },
            })
          }
        >
          Month
        </Text>
        <Text
          style={styles.viewTab}
          onPress={() =>
            router.push({
              pathname: '/family/week',
              params: { date },
            })
          }
        >
          Week
        </Text>
        <Text style={[styles.viewTab, styles.viewTabActive]}>
          Day
        </Text>
      </View>

      {visibleEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No events today
          </Text>

          <Text style={styles.emptyText}>
            A clear day. Add something when the rhythm calls for it.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const participantProfiles = getParticipantProfiles(
              item,
              profiles
            );

            return (
              <View
                style={styles.card}
                onTouchEnd={() =>
                  router.push(`/family/event?id=${item.id}`)
                }
              >
                <Text style={styles.eventTitle}>
                  {item.title}
                </Text>

                <Text style={styles.meta}>
                  {new Date(item.starts_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>

                {item.location ? (
                  <Text style={styles.meta}>
                    {item.location}
                  </Text>
                ) : null}

                <View style={styles.assignedRow}>
                  {participantProfiles.map((participant) =>
                    participant.profile?.avatar_color ? (
                      <View
                        key={participant.user_id}
                        style={[
                          styles.avatar,
                          {
                            backgroundColor:
                              participant.profile.avatar_color,
                          },
                        ]}
                      />
                    ) : null
                  )}

                  <Text style={styles.assignedText}>
                    {getParticipantLabel(item, profiles, familyMemberIds)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/family/create-event',
            params: { date },
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
    paddingTop: 80,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },

  todayTitle: {
    color: '#4c7dff',
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

  card: {
    backgroundColor: '#f4f4f4',
    padding: 18,
    borderRadius: 18,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  meta: {
    color: '#666',
    marginTop: 4,
  },

  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  avatar: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },

  assignedText: {
    color: '#333',
    fontWeight: '600',
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

  emptyState: {
    marginTop: 40,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#f4f4f4',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptyText: {
    color: '#666',
    fontSize: 16,
    lineHeight: 22,
  },
});
