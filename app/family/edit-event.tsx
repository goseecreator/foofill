import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import { supabase } from '../../lib/supabase';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState(new Date());

  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Failed to load event');
      return;
    }

    setTitle(data.title || '');
    setLocation(data.location || '');
    setStartsAt(new Date(data.starts_at));
  }

  async function saveEvent() {
    const { error } = await supabase
      .from('events')
      .update({
        title,
        location,
        starts_at: startsAt.toISOString(),
      })
      .eq('id', id);

    if (error) {
      Alert.alert(error.message);
      return;
    }

    Alert.alert('Event updated');

router.replace(`/family/event?id=${id}`);
  }

  async function deleteEvent() {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      Alert.alert(error.message);
      return;
    }

    Alert.alert('Event deleted');

    router.replace('/family/month');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Event</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Event title"
        style={styles.input}
      />

      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
      >
        <Text>
          {startsAt.toLocaleString()}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={startsAt}
          mode="datetime"
          onChange={(event, selectedDate) => {
            setShowPicker(false);

            if (selectedDate) {
              setStartsAt(selectedDate);
            }
          }}
        />
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveEvent}
      >
        <Text style={styles.buttonText}>
          Save Changes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={deleteEvent}
      >
        <Text style={styles.buttonText}>
          Delete Event
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
    gap: 14,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 16,
  },
  saveButton: {
    backgroundColor: 'black',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButton: {
    backgroundColor: '#d11a2a',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});