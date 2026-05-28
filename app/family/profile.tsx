import { useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

const COLORS = [
  '#000000',
  '#FF6B6B',
  '#4ECDC4',
  '#FFD93D',
  '#6C5CE7',
  '#00B894',
];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');

  async function saveProfile() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return Alert.alert('Not signed in');

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name,
      role_label: 'Adult',
      avatar_color: selectedColor,
    });

    if (error) return Alert.alert(error.message);

    Alert.alert('Profile saved');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      <TextInput
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.sectionTitle}>
        Choose Color
      </Text>

      <View style={styles.colorRow}>
        {COLORS.map((color) => {
          const selected = selectedColor === color;

          return (
            <Pressable
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                selected && styles.selectedCircle,
              ]}
            />
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={saveProfile}
      >
        <Text style={styles.buttonText}>
          Save Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#333',
  },
  button: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});