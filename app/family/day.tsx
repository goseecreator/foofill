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

import { supabase } from '../../lib/supabase';

type Profile = {
  id: string;
  name: string;
  avatar_color: string;
};

type Event = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  event_participants?: {
    user_id: string;
  }[];
};

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (date) {
      loadEvents();
    }
  }, [date]);

  async function loadEvents() {
    setLoading(true);

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_participants (
          user_id
        )
      `)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setEvents(data || []);

    const userIds =
      data
        ?.flatMap(
          (event) =>
            event.event_participants?.map((p) => p.user_id) || []
        )
        .filter(Boolean) || [];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_color')
        .in('id', userIds);

      const profileMap: Record<string, Profile> = {};

      profileData?.forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    }

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

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          isToday && styles.todayTitle,
        ]}
      >
        {new Date(`${date}T12:00:00`).toDateString()}
      </Text>

      {events.length === 0 ? (
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
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const assignedUserId =
              item.event_participants?.[0]?.user_id;

            const assignedProfile = assignedUserId
              ? profiles[assignedUserId]
              : null;

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

                {assignedProfile ? (
                  <View style={styles.assignedRow}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            assignedProfile.avatar_color,
                        },
                      ]}
                    />

                    <Text style={styles.assignedText}>
                      {assignedProfile.name}
                    </Text>
                  </View>
                ) : null}
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