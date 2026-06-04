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

type Member = {
    user_id: string;
    name?: string;
    avatar_color?: string;
};

export default function EditEventScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [startsAt, setStartsAt] = useState(new Date());

    const [showPicker, setShowPicker] = useState(false);

    const [members, setMembers] = useState<Member[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (id) {
            loadEvent();
            loadMembers();
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

        const { data: participants } = await supabase
            .from('event_participants')
            .select('user_id')
            .eq('event_id', id);

        if (participants?.length) {
            setSelectedUserId(participants[0].user_id);
        } else {
            setSelectedUserId('');
        }
    }

    async function loadMembers() {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) return;

        const { data: membership } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', user.id)
            .single();

        if (!membership) return;

        const { data: memberData, error } = await supabase
            .from('family_members')
            .select('user_id')
            .eq('family_id', membership.family_id);

        if (error) {
            Alert.alert(error.message);
            return;
        }

        const userIds = memberData?.map((member) => member.user_id) || [];

        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, name, avatar_color')
            .in('id', userIds);

        const profileMap: Record<string, { name: string; avatar_color: string }> = {};

        profileData?.forEach((profile) => {
            profileMap[profile.id] = {
                name: profile.name,
                avatar_color: profile.avatar_color,
            };
        });

        const membersWithProfiles =
            memberData?.map((member) => ({
                user_id: member.user_id,
                name: profileMap[member.user_id]?.name,
                avatar_color: profileMap[member.user_id]?.avatar_color,
            })) || [];

        setMembers(membersWithProfiles);
    }

    async function saveEvent() {
        const { error: eventError } = await supabase
            .from('events')
            .update({
                title,
                location,
                starts_at: startsAt.toISOString(),
            })
            .eq('id', id);

        if (eventError) {
            Alert.alert(eventError.message);
            return;
        }

        const { error: deleteError } = await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', id);

        if (deleteError) {
            Alert.alert(deleteError.message);
            return;
        }

        if (selectedUserId === 'all') {
  const rows = members.map((member) => ({
    event_id: id,
    user_id: member.user_id,
  }));

  const { error: insertError } = await supabase
    .from('event_participants')
    .insert(rows);

  if (insertError) {
    Alert.alert(insertError.message);
    return;
  }
} else if (selectedUserId) {
  const { error: insertError } = await supabase
    .from('event_participants')
    .insert({
      event_id: id,
      user_id: selectedUserId,
    });

  if (insertError) {
    Alert.alert(insertError.message);
    return;
  }
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

            <Text style={styles.sectionTitle}>
                Assign To
            </Text>

            <View style={styles.memberRow}>
                <TouchableOpacity
  style={[
    styles.member,
    selectedUserId === 'all' && styles.memberSelected,
  ]}
  onPress={() =>
    setSelectedUserId(selectedUserId === 'all' ? '' : 'all')
  }
>
  <Text
    style={[
      styles.memberText,
      selectedUserId === 'all' && styles.memberTextSelected,
    ]}
  >
    All Members
  </Text>
</TouchableOpacity>
                {members.map((member) => {
                    const selected =
                        selectedUserId === member.user_id;

                    return (
                        <TouchableOpacity
                            key={member.user_id}
                            style={[
                                styles.member,
                                selected && styles.memberSelected,
                            ]}
                            onPress={() =>
                                setSelectedUserId(
                                    selected ? '' : member.user_id
                                )
                            }
                        >
                            <Text
                                style={[
                                    styles.memberText,
                                    selected && styles.memberTextSelected,
                                ]}
                            >
                                {member.name || member.user_id.slice(0, 6)}              </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

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

    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 10,
    },

    memberRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },

    member: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: '#f1f1f1',
    },

    memberSelected: {
        backgroundColor: 'black',
    },

    memberText: {
        color: '#333',
        fontWeight: '600',
    },

    memberTextSelected: {
        color: 'white',
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