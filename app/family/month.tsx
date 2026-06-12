import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import {
    CalendarEvent,
    CalendarViewMode,
    filterEventsByViewMode,
    getDateKey,
    getLocalDateKey,
    getParticipantLabel,
    loadFamilyCalendarEvents,
    Profile,
} from '../../lib/familyCalendar';

type CalendarCell = {
    day: number;
    key: string;
    events: CalendarEvent[];
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthScreen() {
    const { date } = useLocalSearchParams<{ date?: string }>();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<CalendarViewMode>('family');
    const [viewDate, setViewDate] = useState(() =>
        date ? new Date(`${date}T12:00:00`) : new Date()
    );

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        setLoading(true);

        const calendarData = await loadFamilyCalendarEvents();

        setEvents(calendarData.events);
        setProfiles(calendarData.profiles);
        setFamilyMemberIds(calendarData.familyMemberIds);
        setCurrentUserId(calendarData.currentUserId);
        setLoading(false);
    }

    const visibleEvents = useMemo(
        () => filterEventsByViewMode(events, viewMode, currentUserId),
        [currentUserId, events, viewMode]
    );

    const grouped = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};

        visibleEvents.forEach((event) => {
            const key = getLocalDateKey(event.starts_at);

            if (!map[key]) {
                map[key] = [];
            }

            map[key].push(event);
        });

        return map;
    }, [visibleEvents]);

    const cells = useMemo(() => {
        const currentYear = viewDate.getFullYear();
        const currentMonth = viewDate.getMonth();

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        const startOffset = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const nextCells: (CalendarCell | null)[] = [];

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

    const selectedDateKey = getDateKey(viewDate);

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

            <View style={styles.switchRow}>
                {(['family', 'mine'] as CalendarViewMode[]).map((mode) => (
                    <Pressable
                        key={mode}
                        style={[
                            styles.switchButton,
                            viewMode === mode && styles.switchButtonActive,
                        ]}
                        onPress={() => setViewMode(mode)}
                    >
                        <Text
                            style={[
                                styles.switchText,
                                viewMode === mode && styles.switchTextActive,
                            ]}
                        >
                            {mode === 'family' ? 'Family' : 'Mine'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.viewRow}>
                <Text style={[styles.viewTab, styles.viewTabActive]}>
                    Month
                </Text>
                <Text
                    style={styles.viewTab}
                    onPress={() =>
                        router.push({
                            pathname: '/family/week',
                            params: { date: selectedDateKey },
                        })
                    }
                >
                    Week
                </Text>
                <Text
                    style={styles.viewTab}
                    onPress={() =>
                        router.push({
                            pathname: '/family/day',
                            params: { date: selectedDateKey },
                        })
                    }
                >
                    Day
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

                    const now = new Date();

                    const todayKey = `${now.getFullYear()}-${String(
                        now.getMonth() + 1
                    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const isToday = cell.key === todayKey;

                    return (
                        <Pressable
                            key={cell.key}
                            style={[
                                styles.cell,
                                isToday && styles.todayCell,
                            ]} onPress={() =>
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
                        >
                            <Text style={styles.dayNumber}>{cell.day}</Text>

                            <View style={styles.eventPreview}>
                                {cell.events.slice(0, 2).map((event) => {
                                    const assignedUserId =
                                        event.event_participants?.[0]?.user_id;
                                    const assignedProfile = assignedUserId
                                        ? profiles[assignedUserId]
                                        : null;

                                    return (
                                        <Text
                                            key={event.id}
                                            style={[
                                                styles.eventText,
                                                {
                                                    color:
                                                        assignedProfile?.avatar_color ||
                                                        '#333',
                                                },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            • {event.title} -{' '}
                                            {getParticipantLabel(
                                                event,
                                                profiles,
                                                familyMemberIds
                                            )}
                                        </Text>
                                    );
                                })}

                                {cell.events.length > 2 ? (
                                    <Text style={styles.moreText}>
                                        +{cell.events.length - 2}
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    router.push({
                        pathname: '/family/create-event',
                        params: { date: selectedDateKey },
                    })
                }
            >
                <Text style={styles.fabText}>＋</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
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
    switchRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    switchButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f1f1f1',
        alignItems: 'center',
    },
    switchButtonActive: {
        backgroundColor: 'black',
    },
    switchText: {
        color: '#333',
        fontWeight: '600',
    },
    switchTextActive: {
        color: 'white',
    },
    viewRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    viewTab: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 9,
        borderRadius: 12,
        backgroundColor: '#f1f1f1',
        color: '#333',
        fontWeight: '600',
    },
    viewTabActive: {
        backgroundColor: '#e8eeff',
        color: '#4c7dff',
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
        minHeight: 92,
        padding: 5.5,
        borderWidth: 0.5,
        borderColor: '#eee',
    },
    dayNumber: {
        fontWeight: '600',
        marginBottom: 4,
    },
    eventPreview: {
        gap: 2,
    },
    eventText: {
        fontSize: 10,
        color: '#333',
        lineHeight: 13,
    },
    moreText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    todayCell: {
        backgroundColor: '#f2f6ff',
        borderColor: '#4c7dff',
        borderWidth: 2,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 36,
        width: 60,
        height: 60,
        borderRadius: 999,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: {
        color: 'white',
        fontSize: 34,
        lineHeight: 36,
    },
});
