import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function CreateFamilyScreen() {
  const [familyName, setFamilyName] = useState('');

  async function createFamily() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      Alert.alert('Not signed in');
      return;
    }

    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: familyName,
        created_by: user.id,
      })
      .select()
      .single();

    if (familyError) {
      Alert.alert(familyError.message);
      return;
    }

    const { error: memberError } = await supabase.from('family_members').insert({
      family_id: family.id,
      user_id: user.id,
      role: 'admin',
    });

    if (memberError) {
      Alert.alert(memberError.message);
      return;
    }

    Alert.alert('Family created');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Family</Text>

      <TextInput
        placeholder="Family name"
        value={familyName}
        onChangeText={setFamilyName}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={createFamily}>
        <Text style={styles.buttonText}>Create Family</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      >
        <Text style={styles.secondaryButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 14, borderRadius: 12 },
  button: { backgroundColor: 'black', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#f1f1f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
});
