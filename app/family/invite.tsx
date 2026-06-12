import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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

export default function InviteMemberScreen() {
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childColor, setChildColor] = useState('#6C5CE7');
  const [addingChild, setAddingChild] = useState(false);

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

  async function addChildProfile() {
    const nextChildName = childName.trim();

    if (!nextChildName) {
      Alert.alert('Enter a child name');
      return;
    }

    setAddingChild(true);

    const { error } = await supabase.rpc('add_child_family_member', {
      child_name: nextChildName,
      child_color: childColor,
    });

    setAddingChild(false);

    if (error) {
      return Alert.alert(
        'Unable to add child',
        `${error.message}\n\nRun scripts/add-child-family-member.sql in Supabase first, then try again.`
      );
    }

    Alert.alert('Child profile added');
    setChildName('');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Manage Members</Text>

      <Text style={styles.sectionTitle}>Add Child Profile</Text>

      <TextInput
        placeholder="Child name"
        value={childName}
        onChangeText={setChildName}
        style={styles.input}
      />

      <View style={styles.colorRow}>
        {COLORS.map((color) => {
          const selected = childColor === color;

          return (
            <Pressable
              key={color}
              onPress={() => setChildColor(color)}
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
        onPress={addChildProfile}
        disabled={addingChild}
      >
        <Text style={styles.buttonText}>
          {addingChild ? 'Adding...' : 'Add Child'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Invite by Email</Text>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 14, borderRadius: 12 },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#333',
  },
  button: { backgroundColor: 'black', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
