import { Host, VStack, HStack, Text, Spacer, Divider, ProgressView, Rectangle, Button } from '@expo/ui/swift-ui';
import { 
  background, 
  foregroundColor, 
  font, 
  cornerRadius, 
  padding,
  containerBackground,
  frame,
  foregroundStyle,
  opacity,
  shadow,
  clipShape,
  tint,
  lineLimit,
  buttonStyle
} from '@expo/ui/swift-ui/modifiers';

export interface CommitmentWidgetData {
  id: string;
  metricType: string;
  targetValue: number;
  overallProgress: number;
  label: string;
  unit: string;
  remainingDays: string;
  isBroken: boolean;
  targetScope: string;
  stakeAmount: number;
  segments: ('future' | 'success' | 'failed' | 'today_success' | 'today_pending')[];
  sentence?: string;
}

export type WidgetProps = {
  commitments: CommitmentWidgetData[];
  selectedIndex?: number;
};

// Widget environment context
export type WidgetEnvironment = {
  family: 'systemSmall' | 'systemMedium' | 'systemLarge';
};



const CommitmentsProgressWidget = (props: WidgetProps, context: any) => {
  "use no memo";
  'widget';

  const getSegmentColor = (status: 'future' | 'success' | 'failed' | 'today') => {
    switch (status) {
      case 'success': return '#05D38E';
      case 'failed': return '#FF4655';
      case 'today_success': return '#05D38E';
      case 'today_pending': return '#3B82F6';
      default: return '#1E293B';
    }
  };

  const renderSlicedProgressBar = (segments: ('future' | 'success' | 'failed' | 'today_success' | 'today_pending')[], overallProgress: number, targetScope: string) => {
    if (targetScope === 'weekly') {
      return (
        <HStack spacing={0} modifiers={[
          cornerRadius(3),
          frame({ height: 7 }),
          clipShape('capsule')
        ]}>
          {Array.from({ length: 20 }).map((_, i) => {
            const segmentValue = i * 5; // each segment represents 5%
            const isFilled = segmentValue < overallProgress;
            return (
              <Rectangle
                key={i}
                modifiers={[
                  foregroundStyle(isFilled ? '#05D38E' : '#FFFFFF'),
                  opacity(isFilled ? 1.0 : 0.06),
                  frame({ height: 7 })
                ]}
              />
            );
          })}
        </HStack>
      );
    }
    return (
      <HStack spacing={4}>
        {(segments || ['future', 'future', 'future', 'future', 'future', 'future', 'future']).map((status, index) => {
          const isFuture = status === 'future';
          const baseColor = isFuture ? '#FFFFFF' : getSegmentColor(status as any);
          const segmentOpacity = isFuture ? 0.06 : 1.0;
          
          const mods = [
            foregroundStyle(baseColor),
            opacity(segmentOpacity),
            cornerRadius(3),
            frame({ height: 7 })
          ];
          
          if (!isFuture) {
            mods.push(shadow({ radius: 3, color: baseColor }));
          }
          
          return (
            <Rectangle
              key={index}
              modifiers={mods}
            />
          );
        })}
      </HStack>
    );
  };

  const getMetricEmoji = (type: string) => {
    switch (type) {
      case 'steps': return '👟';
      case 'run': return '🏃';
      case 'cycle': return '🚴';
      case 'calories': return '🔥';
      case 'activeTime': return '⏱️';
      case 'mindfulness': return '🧘';
      default: return '🎯';
    }
  };

  const commitments = props.commitments || [];
  const family = context?.family || 'systemSmall';

  // Render empty state if there are no active commitments
  if (commitments.length === 0) {
    return (
      <Host>
        <VStack
          alignment="center"
          spacing={10}
          modifiers={[
            containerBackground('#06070B', 'widget'),
            padding({ all: 16 })
          ]}
        >
          <Spacer />
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
            HabitContract 🔒
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundColor('#8F93A3')]}>
            No active commitments.
          </Text>
          <Text modifiers={[font({ size: 10 }), foregroundColor('#4F46E5')]}>
            Open app to lock one!
          </Text>
          <Spacer />
        </VStack>
      </Host>
    );
  }

  // --- SMALL WIDGET ---
  if (family === 'systemSmall') {
    const selectedIdx = props.selectedIndex || 0;
    const commitment = commitments[selectedIdx] || commitments[0];
    const emoji = getMetricEmoji(commitment.metricType);
    const statusColor = commitment.isBroken 
      ? '#FF4655' 
      : '#05D38E';

    return (
      <Host>
        <VStack
          alignment="leading"
          spacing={5}
          modifiers={[
            containerBackground('#06070B', 'widget'),
            padding({ all: 16 })
          ]}
        >
          {/* Header row */}
          <HStack>
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundColor('#FFFFFF')]}>
              {emoji} {commitment.label}
            </Text>
            <Spacer />
            {commitments.length > 1 ? (
              <Button target="next" systemImage="chevron.right" modifiers={[buttonStyle('plain'), foregroundStyle('#8F93A3')]} />
            ) : null}
            <Spacer />
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundColor('#3B82F6')]}>
              €{commitment.stakeAmount}
            </Text>
          </HStack>

          {/* Subtitle */}
          <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3')]}>
            {commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} Target • {commitment.targetValue.toLocaleString()} {commitment.unit}
          </Text>
          {commitment.sentence && (
            <Text modifiers={[font({ size: 7 }), foregroundColor('#8F93A3'), opacity(0.8), lineLimit(1)]}>
              {commitment.sentence}
            </Text>
          )}

          <Spacer />

          {/* Progress Section */}
          <HStack alignment="bottom">
            <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
              {commitment.overallProgress}%
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundColor(statusColor)]}>
              {commitment.isBroken 
                ? '⚠️ Broken' 
                : (commitment.targetScope === 'weekly' ? '🛡️ Safe' : '✅ On Track')}
            </Text>
          </HStack>

          <HStack>
            <Text modifiers={[font({ size: 10 }), foregroundColor('#8F93A3')]}>
              Goal Progress
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 10 }), foregroundColor('#8F93A3')]}>
              {commitment.remainingDays}
            </Text>
          </HStack>

          {/* Sliced Progress Bar Centerpiece */}
          {renderSlicedProgressBar(commitment.segments, commitment.overallProgress, commitment.targetScope)}
        </VStack>
      </Host>
    );
  }

  // --- MEDIUM WIDGET ---
  // Show up to 2 active commitments in a vertical list
  if (family === 'systemMedium') {
    const listItems = commitments.slice(0, 2);

    return (
      <Host>
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            containerBackground('#06070B', 'widget'),
            padding({ all: 14 })
          ]}
        >
          {/* Header Title */}
          <HStack>
            <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundColor('#8F93A3')]}>
              ACTIVE COMMITMENTS
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundColor('#3B82F6')]}>
              🔒 PLEDGED
            </Text>
          </HStack>

          {/* Commitments List */}
          {listItems.map((commitment, index) => {
            const emoji = getMetricEmoji(commitment.metricType);
            const statusColor = commitment.isBroken ? '#FF4655' : '#05D38E';
            return (
              <VStack key={commitment.id || index} alignment="leading" spacing={3}>
                <HStack>
                  <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundColor('#FFFFFF')]}>
                    {emoji} {commitment.label} ({commitment.overallProgress}%)
                  </Text>
                  <Spacer />
                  <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundColor(statusColor)]}>
                    {commitment.isBroken 
                      ? '⚠️ Broken' 
                      : (commitment.targetScope === 'weekly' ? '🛡️ Safe' : '✅ On Track')}
                  </Text>
                  <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundColor('#3B82F6'), padding({ leading: 6 })]}>
                    €{commitment.stakeAmount}
                  </Text>
                </HStack>

                {/* Sliced Progress Bar */}
                {renderSlicedProgressBar(commitment.segments, commitment.overallProgress, commitment.targetScope)}

                <HStack>
                  <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3')]}>
                    {commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} Target • {commitment.targetValue.toLocaleString()} {commitment.unit}
                  </Text>
                  <Spacer />
                  <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3')]}>
                    {commitment.remainingDays}
                  </Text>
                </HStack>
                {commitment.sentence && (
                  <Text modifiers={[font({ size: 7 }), foregroundColor('#8F93A3'), opacity(0.8), lineLimit(1)]}>
                    {commitment.sentence}
                  </Text>
                )}
              </VStack>
            );
          })}
        </VStack>
      </Host>
    );
  }

  // --- LARGE WIDGET ---
  // Show all active commitments and their statuses only, without progress bar or progress percentage
  const largeListItems = commitments.slice(0, 5);

  return (
    <Host>
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[
          containerBackground('#06070B', 'widget'),
          padding({ all: 16 })
        ]}
      >
        {/* Header Title */}
        <HStack>
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundColor('#8F93A3')]}>
            ALL ACTIVE COMMITMENTS
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundColor('#3B82F6')]}>
            🔒 STATUSES ONLY
          </Text>
        </HStack>

        <Spacer modifiers={[frame({ height: 2 })]} />

        {/* Commitments List */}
        {largeListItems.map((commitment, index) => {
          const emoji = getMetricEmoji(commitment.metricType);
          const statusColor = commitment.isBroken ? '#FF4655' : '#05D38E';
          const statusText = commitment.isBroken 
            ? '⚠️ Broken' 
            : (commitment.targetScope === 'weekly' ? '🛡️ Safe' : '✅ On Track');

          return (
            <VStack 
              key={commitment.id || index} 
              alignment="leading" 
              spacing={4} 
              modifiers={[padding({ bottom: index < largeListItems.length - 1 ? 6 : 0 })]}
            >
              <HStack>
                <VStack alignment="leading" spacing={2}>
                  <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundColor('#FFFFFF')]}>
                    {emoji} {commitment.label}
                  </Text>
                  <Text modifiers={[font({ size: 10 }), foregroundColor('#8F93A3')]}>
                    {commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} • {commitment.targetValue.toLocaleString()} {commitment.unit}
                  </Text>
                  {commitment.sentence && (
                    <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3'), opacity(0.8), lineLimit(1)]}>
                      {commitment.sentence}
                    </Text>
                  )}
                </VStack>

                <Spacer />

                <VStack alignment="trailing" spacing={2}>
                  <HStack spacing={6}>
                    <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundColor(statusColor)]}>
                      {statusText}
                    </Text>
                    <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundColor('#3B82F6')]}>
                      €{commitment.stakeAmount}
                    </Text>
                  </HStack>
                  <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3')]}>
                    {commitment.remainingDays}
                  </Text>
                </VStack>
              </HStack>

              {index < largeListItems.length - 1 && (
                <Divider modifiers={[padding({ top: 6 })]} />
              )}
            </VStack>
          );
        })}

        {commitments.length > 5 && (
          <HStack>
            <Spacer />
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundColor('#8F93A3')]}>
              + {commitments.length - 5} more active
            </Text>
            <Spacer />
          </HStack>
        )}
      </VStack>
    </Host>
  );
};

export default CommitmentsProgressWidget;
