import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Event = {
    id: string;
    title: string;
    starts_at: string;
};

type CalendarCell = {
    day: number;
    key: string;
    events: Event[];
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLocalDateKey(dateString: string) {
    const date = new Date(dateString);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MonthScreen() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        setLoading(true);

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: membership, error: membershipError } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', user.id)
            .single();

        if (membershipError || !membership) {
            console.log(membershipError);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('events')
            .select('id, title, starts_at')
            .eq('family_id', membership.family_id)
            .order('starts_at', { ascending: true });

        if (error) {
            console.log(error);
            setLoading(false);
            return;
        }

        setEvents(data || []);
        setLoading(false);
    }

    const grouped = useMemo(() => {
        const map: Record<string, Event[]> = {};

        events.forEach((event) => {
            const key = getLocalDateKey(event.starts_at);

            if (!map[key]) {
                map[key] = [];
            }

            map[key].push(event);
        });

        return map;
    }, [events]);

    const cells = useMemo(() => {
        const currentYear = viewDate.getFullYear();
        const currentMonth = viewDate.getMonth();

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        const startOffset = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const nextCells: Array<CalendarCell | null> = [];

        for (let i = 0; i < startOffset; i++) {
            nextCells.push(null);
        }

        for (let day = 1; day <= totalDays; day++) {
            const key = `${currentYear}-${String(currentMonth + 1).padStart(
                2,
                '0'
            )}-${String(day).padStart(2, '0')}`;

            nextCells.push({
                day,
                key,
                events: grouped[key] || [],
            });
        }

        return nextCells;
    }, [grouped, viewDate]);

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    function goToPreviousMonth() {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    }

    function goToNextMonth() {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
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
            <View style={styles.navRow}>
                <Text style={styles.navButton} onPress={goToPreviousMonth}>
                    ‹
                </Text>

                <Text style={styles.monthTitle}>
                    {viewDate.toLocaleString('default', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </Text>

                <Text style={styles.navButton} onPress={goToNextMonth}>
                    ›
                </Text>
            </View>

            <View style={styles.weekRow}>
                {WEEK_DAYS.map((day) => (
                    <Text key={day} style={styles.weekDay}>
                        {day}
                    </Text>
                ))}
            </View>

            <View style={styles.grid}>
                {cells.map((cell, index) => {
                    if (!cell) {
                        return <View key={`empty-${index}`} style={styles.cell} />;
                    }

                    return (
                       <Pressable
  key={cell.key}
  style={styles.cell}
  onPress={() =>
    router.push({
      pathname: '/family/day',
      params: {
        date: cell.key,
      },
    })
  }
  onLongPress={() =>
    router.push({
      pathname: '/family/create-event',
      params: {
        date: cell.key,
      },
    })
  }
>              <Text style={styles.dayNumber}>{cell.day}</Text>

                            <View style={styles.eventDots}>
                                {cell.events.slice(0, 3).map((event) => (
                                    <View key={event.id} style={styles.dot} />
                                ))}
                            </View>

                            {cell.events.length > 3 ? (
                                <Text style={styles.moreText}>
                                    +{cell.events.length - 3}
                                </Text>
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 80,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    navButton: {
        fontSize: 36,
        fontWeight: '700',
    },
    monthTitle: {
        fontSize: 32,
        fontWeight: '700',
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    weekDay: {
        flex: 1,
        textAlign: 'center',
        fontWeight: '600',
        color: '#666',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: '14.28%',
        aspectRatio: 1,
        padding: 6,
        borderWidth: 0.5,
        borderColor: '#eee',
    },
    dayNumber: {
        fontWeight: '600',
        marginBottom: 4,
    },
    eventDots: {
        gap: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: '#000',
    },
    moreText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
});