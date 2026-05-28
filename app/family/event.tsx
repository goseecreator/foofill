import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
  notes: string | null;
};

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  async function loadEvent() {
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('id, title, starts_at, location, notes')
      .eq('id', id)
      .single();

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setEvent(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>

      <Text style={styles.meta}>
        {new Date(event.starts_at).toLocaleString()}
      </Text>

      {event.location ? (
        <Text style={styles.meta}>{event.location}</Text>
      ) : null}

      {event.notes ? (
        <Text style={styles.notes}>{event.notes}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
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
    marginBottom: 16,
  },
  meta: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  notes: {
    fontSize: 16,
    marginTop: 24,
    lineHeight: 24,
  },
});