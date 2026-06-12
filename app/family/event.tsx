import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { supabase } from '../../lib/supabase';

type Participant = {
  user_id: string;
  name?: string;
  avatar_color?: string;
};

type Event = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  notes: string | null;
  family_id: string;
};

function getParticipantLabel(
  participants: Participant[],
  familyMemberIds: string[]
) {
  if (participants.length === 0) {
    return 'Unassigned';
  }

  const participantIds = new Set(
    participants.map((participant) => participant.user_id)
  );

  if (
    familyMemberIds.length > 0 &&
    familyMemberIds.every((memberId) => participantIds.has(memberId))
  ) {
    return 'All Members';
  }

  return participants
    .map((participant) => participant.name || participant.user_id.slice(0, 6))
    .join(', ');
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadEvent();
      }
    }, [id])
  );

  async function loadEvent() {
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('id, title, starts_at, location, notes, family_id')
      .eq('id', id)
      .single();

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setEvent(data);

    const { data: memberData } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', data.family_id);

    setFamilyMemberIds(memberData?.map((member) => member.user_id) || []);

    const { data: participantData } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', id);

    const userIds = participantData?.map((p) => p.user_id) || [];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_color')
        .in('id', userIds);

      const profileMap: Record<
        string,
        { name: string; avatar_color: string }
      > = {};

      profileData?.forEach((profile) => {
        profileMap[profile.id] = {
          name: profile.name,
          avatar_color: profile.avatar_color,
        };
      });

      setParticipants(
        userIds.map((userId) => ({
          user_id: userId,
          name: profileMap[userId]?.name,
          avatar_color: profileMap[userId]?.avatar_color,
        }))
      );
    } else {
      setParticipants([]);
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

  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  const participantLabel = getParticipantLabel(participants, familyMemberIds);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {event.title}
      </Text>

      <Text style={styles.meta}>
        {new Date(event.starts_at).toLocaleString()}
      </Text>

      {event.location ? (
        <Text style={styles.meta}>
          {event.location}
        </Text>
      ) : null}

      <Text style={styles.meta}>
        {participantLabel === 'All Members' ||
        participantLabel === 'Unassigned'
          ? participantLabel
          : `Assigned: ${participantLabel}`}
      </Text>

      {event.notes ? (
        <Text style={styles.notes}>
          {event.notes}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.push(`/family/edit-event?id=${event.id}`)
        }
      >
        <Text style={styles.buttonText}>
          Edit Event
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
    marginBottom: 16,
  },

  meta: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },

  notes: {
    fontSize: 16,
    marginTop: 24,
    lineHeight: 24,
  },

  button: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 28,
  },

  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
