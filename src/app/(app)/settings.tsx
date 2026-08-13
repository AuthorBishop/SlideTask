import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Music4, Vibrate, X } from 'lucide-react-native';
import { useSettings, SOUND_PACK_OPTIONS } from '@/ctx/settings';
import { playDone } from '@/utils/sounds';

export default function SettingsScreen() {
  const router = useRouter();
  const { soundEnabled, hapticEnabled, soundPack, setSoundEnabled, setHapticEnabled, setSoundPack } =
    useSettings();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* 顶部标题栏 */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-3xl font-glow-sans-sc text-foreground font-semibold tracking-tight">
          设置
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <X size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} className="flex-1">
        {/* 反馈开关 */}
        <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
                <Music4 size={17} color="#6366F1" />
              </View>
              <View>
                <Text className="text-base font-glow-sans-sc text-foreground font-medium">音效</Text>
                <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                  节点点亮与完成提示音
                </Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
              thumbColor={soundEnabled ? '#6366F1' : '#FFFFFF'}
            />
          </View>
          <View className="h-px mx-4" style={{ backgroundColor: '#F3F4F6' }} />
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
                <Vibrate size={17} color="#6366F1" />
              </View>
              <View>
                <Text className="text-base font-glow-sans-sc text-foreground font-medium">震动</Text>
                <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                  拖动时的触觉反馈
                </Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
              thumbColor={hapticEnabled ? '#6366F1' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* 音效风格 */}
        <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-6 mb-2 px-1">
          音效风格{!soundEnabled ? '（音效已关闭）' : ''}
        </Text>
        <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
          {SOUND_PACK_OPTIONS.map((opt, idx) => {
            const selected = soundPack === opt.id;
            return (
              <View key={opt.id}>
                {idx > 0 && <View className="h-px mx-4" style={{ backgroundColor: '#F3F4F6' }} />}
                <Pressable
                  disabled={!soundEnabled}
                  onPress={() => {
                    setSoundPack(opt.id);
                    playDone(true); // 试听该方案
                  }}
                  className={`flex-row items-center justify-between px-4 py-4 ${!soundEnabled ? 'opacity-40' : ''}`}
                >
                  <View>
                    <Text className="text-base font-glow-sans-sc text-foreground font-medium">
                      {opt.label}
                    </Text>
                    <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                      {opt.desc}
                    </Text>
                  </View>
                  {selected && (
                    <View className="w-6 h-6 items-center justify-center rounded-full" style={{ backgroundColor: '#6366F1' }}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-4 px-1 leading-5">
          提示：手机震动需在系统设置中开启"触感反馈"（以红米/小米为例：设置 → 声音与触感 → 触感反馈）。此处开关仅控制 App 内的震动与音效。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
