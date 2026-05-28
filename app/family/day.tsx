import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  location: string | null;
};

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

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
      .select('*')
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setEvents(data || []);
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
      <Text style={styles.title}>
        {new Date(`${date}T12:00:00`).toDateString()}
      </Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
          </View>
        )}
      />
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
});