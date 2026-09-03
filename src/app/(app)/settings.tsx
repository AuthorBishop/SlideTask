import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Check, Music4, Tag, Vibrate, X } from 'lucide-react-native';
import { useSettings, SOUND_PACK_OPTIONS } from '@/ctx/settings';
import { playDone } from '@/utils/sounds';
import { isReminderSupported } from '@/utils/reminder';
import { getChannel, setChannel } from '@/lib/analytics';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    soundEnabled,
    hapticEnabled,
    soundPack,
    reminderEnabled,
    setSoundEnabled,
    setHapticEnabled,
    setSoundPack,
    setReminderEnabled,
  } = useSettings();

  // 渠道口令（增长归因）
  const [channelCode, setChannelCode] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    getChannel().then(setChannelCode).catch(() => setChannelCode(null));
  }, []);

  const handleSaveChannel = async () => {
    const res = await setChannel(draft);
    if (!res.ok) {
      setInvalid(true);
      return;
    }
    setChannelCode(res.code);
    setEditing(false);
    setDraft('');
    setInvalid(false);
  };

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
        {/* 每日提醒：开启即请求系统通知权限（需用户手势），Web 端不支持 */}
        <View className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: '#FFFFFF' }}>
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
                <Bell size={17} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-glow-sans-sc text-foreground font-medium">每日提醒</Text>
                <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                  每晚 20:00 提醒你推进一个节点
                </Text>
              </View>
            </View>
            <Switch
              value={reminderEnabled}
              disabled={!isReminderSupported()}
              onValueChange={(v) => setReminderEnabled(v)}
              trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
              thumbColor={reminderEnabled ? '#6366F1' : '#FFFFFF'}
            />
          </View>
          {!isReminderSupported() && (
            <View className="h-px mx-4" style={{ backgroundColor: '#F3F4F6' }} />
          )}
          {!isReminderSupported() && (
            <Text className="text-xs font-glow-sans-sc text-muted-foreground px-4 py-2">
              每日提醒仅支持手机端，请在手机上打开此开关
            </Text>
          )}
        </View>

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

        {/* 渠道口令（增长归因） */}
        <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-6 mb-2 px-1">
          渠道口令
        </Text>
        <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
          <View className="px-4 py-4">
            <View className="flex-row items-center">
              <View className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
                <Tag size={17} color="#6366F1" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-glow-sans-sc text-foreground font-medium">
                  {channelCode ?? '未设置'}
                </Text>
                <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                  输入博主口令码，帮我们了解你从哪里认识 SlideTask
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setDraft('');
                  setInvalid(false);
                  setEditing((v) => !v);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="ml-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <Text className="text-xs font-glow-sans-sc text-foreground">
                  {editing ? '收起' : '设置'}
                </Text>
              </Pressable>
            </View>

            {editing && (
              <View className="flex-row items-center gap-2 mt-3">
                <TextInput
                  value={draft}
                  onChangeText={(t) => {
                    setDraft(t);
                    setInvalid(false);
                  }}
                  placeholder="例如 SLIDE-A"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveChannel}
                  className="flex-1 px-3 py-2 rounded-xl font-sans text-sm text-foreground"
                  style={{ backgroundColor: '#F9FAFB' }}
                />
                <Pressable
                  onPress={handleSaveChannel}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="w-9 h-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#6366F1' }}
                >
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
              </View>
            )}

            {invalid && (
              <Text className="text-xs font-glow-sans-sc mt-2" style={{ color: '#EF4444' }}>
                口令码无效：仅支持 2-32 位字母、数字、- 和 _
              </Text>
            )}
          </View>
        </View>

        <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-4 px-1 leading-5">
          提示：手机震动需在系统设置中开启"触感反馈"（以红米/小米为例：设置 → 声音与触感 → 触感反馈）。此处开关仅控制 App 内的震动与音效。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
