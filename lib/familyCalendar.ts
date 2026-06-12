import { supabase } from './supabase';

export type CalendarViewMode = 'family' | 'mine';

export type Profile = {
  id: string;
  name: string;
  avatar_color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  event_participants?: {
    user_id: string;
  }[];
};

type LoadCalendarEventsOptions = {
  start?: Date;
  end?: Date;
};

export function getLocalDateKey(dateString: string) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getParticipantProfiles(
  event: CalendarEvent,
  profiles: Record<string, Profile>
) {
  return (
    event.event_participants?.map((participant) => ({
      user_id: participant.user_id,
      profile: profiles[participant.user_id],
    })) || []
  );
}

export function getParticipantLabel(
  event: CalendarEvent,
  profiles: Record<string, Profile>,
  familyMemberIds: string[]
) {
  const participantProfiles = getParticipantProfiles(event, profiles);

  if (participantProfiles.length === 0) {
    return 'Unassigned';
  }

  const participantIds = new Set(
    participantProfiles.map((participant) => participant.user_id)
  );

  if (
    familyMemberIds.length > 0 &&
    familyMemberIds.every((memberId) => participantIds.has(memberId))
  ) {
    return 'All Members';
  }

  return participantProfiles
    .map(
      (participant) =>
        participant.profile?.name || participant.user_id.slice(0, 6)
    )
    .join(', ');
}

export function filterEventsByViewMode(
  events: CalendarEvent[],
  mode: CalendarViewMode,
  currentUserId: string | null
) {
  if (mode === 'family') {
    return events;
  }

  return events.filter((event) => {
    const participants = event.event_participants || [];

    return (
      participants.length === 0 ||
      participants.some((participant) => participant.user_id === currentUserId)
    );
  });
}

export async function loadFamilyCalendarEvents(
  options: LoadCalendarEventsOptions = {}
) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return {
      events: [],
      profiles: {},
      familyMemberIds: [],
      currentUserId: null,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    console.log(membershipError);

    return {
      events: [],
      profiles: {},
      familyMemberIds: [],
      currentUserId: user.id,
    };
  }

  const { data: memberData } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', membership.family_id);

  const familyMemberIds = memberData?.map((member) => member.user_id) || [];

  let query = supabase
    .from('events')
    .select(
      `
      id,
      title,
      starts_at,
      location,
      event_participants (
        user_id
      )
    `
    )
    .eq('family_id', membership.family_id)
    .order('starts_at', { ascending: true });

  if (options.start) {
    query = query.gte('starts_at', options.start.toISOString());
  }

  if (options.end) {
    query = query.lte('starts_at', options.end.toISOString());
  }

  const { data: eventData, error: eventError } = await query;

  if (eventError) {
    console.log(eventError);

    return {
      events: [],
      profiles: {},
      familyMemberIds,
      currentUserId: user.id,
    };
  }

  const events = (eventData || []) as CalendarEvent[];
  const profileIds = Array.from(
    new Set([
      ...familyMemberIds,
      ...events.flatMap(
        (event) =>
          event.event_participants?.map((participant) => participant.user_id) ||
          []
      ),
    ])
  );

  if (profileIds.length === 0) {
    return {
      events,
      profiles: {},
      familyMemberIds,
      currentUserId: user.id,
    };
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .in('id', profileIds);

  const profiles: Record<string, Profile> = {};

  profileData?.forEach((profile) => {
    profiles[profile.id] = profile;
  });

  return {
    events,
    profiles,
    familyMemberIds,
    currentUserId: user.id,
  };
}
