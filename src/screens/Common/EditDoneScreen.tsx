import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { styles } from './EditDoneScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditDone'>;
type Route = {
  key: string;
  name: 'EditDone';
  params: RootStackParamList['EditDone'];
};

export default function EditDoneScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { title, bodyLines, buttonLabel, navigateTo } = route.params;

  const onPressPrimary = useCallback(() => {
    if (navigateTo.type === 'home') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
      return;
    }

    if (navigateTo.type === 'schedule-list') {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'AppTabs', params: { screen: 'HomeTab' } },
          { name: 'ScheduleList', params: { petId: navigateTo.petId } },
        ],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'AppTabs',
          params: {
            screen: 'TimelineTab',
            params: {
              screen: 'RecordDetail',
              params: {
                petId: navigateTo.petId,
                memoryId: navigateTo.memoryId,
              },
            },
          },
        },
      ],
    });
  }, [navigateTo, navigation]);

  return (
    <View style={styles.screen}>
      <View style={styles.confettiOne} />
      <View style={styles.confettiTwo} />
      <View style={styles.confettiThree} />
      <View style={styles.confettiFour} />
      <View style={styles.confettiFive} />

      <View style={styles.hero}>
        <View style={styles.checkCard}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={30} color="#6D6AF8" />
          </View>
        </View>

        <AppText preset="title2" style={styles.title}>
          {title}
        </AppText>
        <AppText preset="body" style={styles.body}>
          {bodyLines[0]}
        </AppText>
        {bodyLines[1] ? (
          <AppText preset="body" style={styles.body}>
            {bodyLines[1]}
          </AppText>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.primaryButton}
        onPress={onPressPrimary}
      >
        <AppText preset="body" style={styles.primaryButtonText}>
          {buttonLabel ?? '홈으로 가기'}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
