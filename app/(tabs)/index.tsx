import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import AuthScreen from '../auth';
import CreateFamilyScreen from '../family/create';
import FamilyHomeScreen from '../family/home';

import { supabase } from '../../lib/supabase';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [hasFamily, setHasFamily] = useState(false);

  useEffect(() => {
    checkAuth();

    const { data } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session?.user) {
      setSessionExists(false);
      setHasFamily(false);
      setLoading(false);
      return;
    }

    setSessionExists(true);

    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    setHasFamily(!!membership);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!sessionExists) {
    return <AuthScreen />;
  }

  if (!hasFamily) {
    return <CreateFamilyScreen />;
  }

  return <FamilyHomeScreen />;
}