import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    Pressable,
    TouchableOpacity,
    View,
} from 'react-native';

import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const COLORS = [
  '#000000',
  '#FF6B6B',
  '#4ECDC4',
  '#FFD93D',
  '#6C5CE7',
  '#00B894',
];

type Member = {
  user_id: string;
  name?: string;
  phone?: string;
  avatar_color?: string;
};

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
    loadMembers();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    setEmail(user.email || '');
    setPhone(user.phone || '');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name, phone, avatar_color')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      Alert.alert(error.message);
      return;
    }

    if (profile?.name) {
      setName(profile.name);
    }

    if (profile?.phone) {
      setPhone(profile.phone);
    }

    if (profile?.avatar_color) {
      setSelectedColor(profile.avatar_color);
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setLoadingMembers(false);
      return;
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }

    const { data: memberData, error } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', membership.family_id);

    if (error) {
      Alert.alert(error.message);
      setLoadingMembers(false);
      return;
    }

    const userIds = memberData?.map((member) => member.user_id) || [];

    if (userIds.length === 0) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, name, phone, avatar_color')
      .in('id', userIds);

    const profileMap: Record<
      string,
      { name: string; phone?: string; avatar_color: string }
    > =
      {};

    profileData?.forEach((profile) => {
      profileMap[profile.id] = {
        name: profile.name,
        phone: profile.phone,
        avatar_color: profile.avatar_color,
      };
    });

    const membersWithProfiles =
      memberData?.map((member) => ({
        user_id: member.user_id,
        name: profileMap[member.user_id]?.name,
        phone: profileMap[member.user_id]?.phone,
        avatar_color: profileMap[member.user_id]?.avatar_color,
      })) || [];

    setMembers(membersWithProfiles);
    setLoadingMembers(false);
  }

  async function saveProfile() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return Alert.alert('Not signed in');

    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name,
      phone,
      role_label: 'Adult',
      avatar_color: selectedColor,
    });

    if (error) {
      setSaving(false);
      return Alert.alert(error.message);
    }

    const authUpdates: {
      email?: string;
      password?: string;
    } = {};

    const nextEmail = email.trim();

    if (nextEmail && nextEmail !== user.email) {
      authUpdates.email = nextEmail;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setSaving(false);
        return Alert.alert('Password must be at least 6 characters.');
      }

      if (newPassword !== confirmPassword) {
        setSaving(false);
        return Alert.alert('Passwords do not match.');
      }

      authUpdates.password = newPassword;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authUpdates);

      if (authError) {
        setSaving(false);
        return Alert.alert(authError.message);
      }
    }

    setNewPassword('');
    setConfirmPassword('');
    await loadMembers();
    setSaving(false);

    Alert.alert('Profile saved');
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteAccount,
        },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);

    const { error } = await supabase.rpc('delete_current_user');

    if (error) {
      setDeleting(false);
      return Alert.alert(
        'Unable to delete account',
        `${error.message}\n\nRun scripts/delete-current-user.sql in Supabase first, then try again.`
      );
    }

    await supabase.auth.signOut();
    setDeleting(false);
    router.replace('/');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Your Profile</Text>

      <TextInput
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <TextInput
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        style={styles.input}
      />

      <Text style={styles.sectionTitle}>
        Change Password
      </Text>

      <TextInput
        placeholder="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
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

      <Text style={styles.sectionTitle}>
        Family Members
      </Text>

      {loadingMembers ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.memberRow}>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>
              No members found
            </Text>
          ) : (
            members.map((member) => (
              <View key={member.user_id} style={styles.member}>
                {member.avatar_color ? (
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: member.avatar_color },
                    ]}
                  />
                ) : null}

                <Text style={styles.memberText}>
                  {member.name || member.user_id.slice(0, 6)}
                </Text>

                {member.phone ? (
                  <Text style={styles.memberMeta}>
                    {member.phone}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.profileActionRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/family/invite')}
        >
          <Text style={styles.secondaryButtonText}>
            Manage Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/family/invitations')}
        >
          <Text style={styles.secondaryButtonText}>
            Invitations
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDeleteAccount}
        disabled={deleting}
      >
        <Text style={styles.buttonText}>
          {deleting ? 'Deleting...' : 'Delete Account'}
        </Text>
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
  memberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minWidth: 140,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#f1f1f1',
  },
  memberAvatar: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  memberText: {
    color: '#333',
    fontWeight: '600',
  },
  memberMeta: {
    color: '#666',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButton: {
    backgroundColor: '#d11a2a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
