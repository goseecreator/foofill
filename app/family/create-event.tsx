import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
type Member = {
  user_id: string;
  name?: string;
  avatar_color?: string;
};

export default function CreateEventScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    if (date) {
      return new Date(`${date}T12:00:00`);
    }

    return new Date();
  });

  const [showPicker, setShowPicker] = useState(false);
  const [location, setLocation] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        loadMembers();
    }, []);

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

        if (userIds.length === 0) {
            setMembers([]);
            return;
        }

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

    async function createEvent() {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) return Alert.alert('Not signed in');

        const { data: membership } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', user.id)
            .single();

        if (!membership) return Alert.alert('No family found');

        const { data: event, error } = await supabase
            .from('events')
            .insert({
                family_id: membership.family_id,
                created_by: user.id,
                title,
                starts_at: startsAt.toISOString(), 
                location,
            })
            .select()
            .single();

        if (error || !event) {
            return Alert.alert(error?.message || 'Failed');
        }

        if (selectedUserId === 'all') {
            const rows = members.map((member) => ({
                event_id: event.id,
                user_id: member.user_id,
            }));

            const { error: participantError } = await supabase
                .from('event_participants')
                .insert(rows);

            if (participantError) {
                return Alert.alert(participantError.message);
            }
        } else if (selectedUserId) {
            const { error: participantError } = await supabase
                .from('event_participants')
                .insert({
                    event_id: event.id,
                    user_id: selectedUserId,
                });

            if (participantError) {
                return Alert.alert(participantError.message);
            }
        }

        Alert.alert('Event created');
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Event</Text>

            <TextInput
                placeholder="Event title"
                value={title}
                onChangeText={setTitle}
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

            <TextInput
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
            />

            <Text style={styles.sectionTitle}>
                Assign To
            </Text>

            <FlatList
                data={members}
                keyExtractor={(item) => item.user_id}
                horizontal
                style={styles.memberList}
                contentContainerStyle={styles.memberListContent}
                ListHeaderComponent={
                    <Pressable
                        onPress={() =>
                            setSelectedUserId(
                                selectedUserId === 'all' ? '' : 'all'
                            )
                        }
                        style={[
                            styles.member,
                            styles.allMember,
                            selectedUserId === 'all' &&
                                styles.memberSelected,
                        ]}
                    >
                        <Text style={styles.memberText}>
                            All Members
                        </Text>
                    </Pressable>
                }
                renderItem={({ item }) => {
                    const selected = selectedUserId === item.user_id;
                    const memberColor = item.avatar_color || '#333';

                    return (
                        <Pressable
                            onPress={() => setSelectedUserId(item.user_id)}
                            style={[
                                styles.member,
                                {
                                    backgroundColor: memberColor,
                                    borderColor: memberColor,
                                },
                                selected && styles.memberSelected,
                            ]}
                        >
                            <Text
                                style={styles.memberText}
                            >
                                {item.name || item.user_id.slice(0, 6)}
                            </Text>
                        </Pressable>
                    );
                }}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={createEvent}
            >
                <Text style={styles.buttonText}>
                    Save Event
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
        marginTop: 10,
    },
    member: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        height: 34,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 2,
        backgroundColor: '#f1f1f1',
    },
    memberSelected: {
        borderColor: 'black',
    },
    allMember: {
        backgroundColor: '#333',
        borderColor: '#333',
    },
    memberList: {
        maxHeight: 42,
        flexGrow: 0,
    },
    memberListContent: {
        gap: 10,
        alignItems: 'flex-start',
    },
    memberText: {
        color: 'white',
        fontWeight: '600',
    },
    button: {
        backgroundColor: 'black',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 18,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
    },
});
