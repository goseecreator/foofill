import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

type Invitation = {
  id: string;
  family_id: string;
  invited_email: string;
  role: string;
};

export default function InvitationsScreen() {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user?.email) return;

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('invited_email', user.email)
      .is('accepted_at', null);

    if (error) {
      Alert.alert(error.message);
      return;
    }

    setInvitations(data || []);
    setLoading(false);
  }

  async function acceptInvitation(invitation: Invitation) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) return;

    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: invitation.family_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      Alert.alert(memberError.message);
      return;
    }

    const { error: inviteError } = await supabase
      .from('invitations')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (inviteError) {
      Alert.alert(inviteError.message);
      return;
    }

    Alert.alert('Joined family');

    loadInvitations();
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
      <Text style={styles.title}>Invitations</Text>

      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.email}>
              {item.invited_email}
            </Text>

            <Text style={styles.role}>
              Role: {item.role}
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => acceptInvitation(item)}
            >
              <Text style={styles.buttonText}>
                Accept Invitation
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 20,
    borderRadius: 18,
    gap: 10,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
  },
  role: {
    color: '#666',
  },
  button: {
    backgroundColor: 'black',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});