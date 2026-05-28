import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';

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
  event_participants: {
    user_id: string;
  }[];
};

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log(membershipError);
      setLoading(false);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        event_participants (
          user_id
        )
      `)
      .eq('family_id', membership.family_id)
      .order('starts_at', { ascending: true });

    if (eventError) {
      console.log(eventError);
      setLoading(false);
      return;
    }

    const userIds =
      eventData
        ?.flatMap((event) =>
          event.event_participants?.map((p) => p.user_id) || []
        )
        .filter(Boolean) || [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_color')
        .in('id', userIds);

      if (profileError) {
        console.log(profileError);
      }

      const profileMap: Record<string, Profile> = {};

      profileData?.forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    }

    setEvents(eventData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Calendar</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const assignedUserId = item.event_participants?.[0]?.user_id;
          const assignedProfile = assignedUserId
            ? profiles[assignedUserId]
            : null;

          return (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.title}</Text>

              <Text style={styles.meta}>
                {new Date(item.starts_at).toLocaleString()}
              </Text>

              {item.location ? (
                <Text style={styles.meta}>{item.location}</Text>
              ) : null}

              {assignedUserId ? (
                <View style={styles.assignedRow}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          assignedProfile?.avatar_color || '#000',
                      },
                    ]}
                  />

                  <Text style={styles.meta}>
                    Assigned: {assignedProfile?.name || assignedUserId.slice(0, 6)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 18,
    borderRadius: 18,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  meta: {
    color: '#666',
    fontSize: 15,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },
});