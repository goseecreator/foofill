import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function FamilyHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    loadFamily();
  }, []);

  async function loadFamily() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

if (!user) {
  router.replace('/');
  setLoading(false);
  return;
}
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        role,
        families (
          name
        )
      `)
      .eq('user_id', user.id)
      .single();

  if (error) {
  console.log(error);
  setLoading(false);
  return;
}

    setRole(data.role);

    if (Array.isArray(data.families)) {
      setFamilyName(data.families[0]?.name ?? '');
    } else {
      setFamilyName(data.families?.name ?? '');
    }

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
      <Text style={styles.title}>{familyName}</Text>

      <Text style={styles.subtitle}>
        Your role: {role}
      </Text>

     <TouchableOpacity
  style={styles.card}
  onPress={() => router.push('/family/create-event')}
>
  <Text style={styles.cardTitle}>Create Event</Text>
</TouchableOpacity>

<TouchableOpacity 
    style={styles.card}
    onPress={() => router.push('/family/invite')}>
  <Text style={styles.cardTitle}>Invite Member</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={() => router.push('/family/invitations')}
>
  <Text style={styles.cardTitle}>Invitations</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={() => router.push('/family/profile')}
>
  <Text style={styles.cardTitle}>Profile</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={() => router.push('/family/calendar')}
>
  <Text style={styles.cardTitle}>View Calendar</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={() => router.push('/family/month')}
>
  <Text style={styles.cardTitle}>Month View</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={async () => {
    await supabase.auth.signOut();
    router.replace('/');
  }}
>
  <Text style={styles.cardTitle}>Log Out</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 100,
    gap: 16,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#f4f4f4',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});