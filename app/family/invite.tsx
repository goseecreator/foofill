import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function InviteMemberScreen() {
  const [email, setEmail] = useState('');

  async function inviteMember() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) return Alert.alert('Not signed in');

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) return Alert.alert('No family found');

    const { error } = await supabase.from('invitations').insert({
      family_id: membership.family_id,
      invited_email: email,
      role: 'member',
      invited_by: user.id,
    });

    if (error) return Alert.alert(error.message);

    Alert.alert('Invitation created');
    setEmail('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite Member</Text>

      <TextInput
        placeholder="Member email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={inviteMember}>
        <Text style={styles.buttonText}>Create Invite</Text>
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
});