import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  starts_at: string;
};

export default function MonthScreen() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

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

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('family_id', membership.family_id);

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  const grouped = useMemo(() => {
    const map: Record<string, Event[]> = {};

    events.forEach((event) => {
      const day = new Date(event.starts_at)
        .toISOString()
        .split('T')[0];

      if (!map[day]) {
        map[day] = [];
      }

      map[day].push(event);
    });

    return map;
  }, [events]);

  const days = Object.keys(grouped).sort();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={days}
      keyExtractor={(item) => item}
      contentContainerStyle={{ padding: 24, gap: 20 }}
      renderItem={({ item }) => (
        <View>
          <Text style={styles.day}>
            {new Date(item).toDateString()}
          </Text>

          <View style={styles.dayCard}>
            {grouped[item].map((event) => (
              <View
                key={event.id}
                style={styles.event}
              >
                <Text style={styles.eventTitle}>
                  {event.title}
                </Text>

                <Text style={styles.eventTime}>
                  {new Date(event.starts_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  day: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  event: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTime: {
    color: '#666',
    marginTop: 4,
  },
});