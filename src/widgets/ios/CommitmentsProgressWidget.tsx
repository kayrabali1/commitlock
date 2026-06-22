import { Host, VStack, HStack, Text, Spacer, Divider, Rectangle, Button } from '@expo/ui/swift-ui';
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

  const getSegmentColor = (status: string) => {
    switch (status) {
      case 'success': return '#05D38E';
      case 'failed': return '#FF4655';
      case 'today_success': return '#F5A623';
      case 'today_pending': return '#F5A623';
      default: return '#2A2D3A';
    }
  };

  const renderSlicedProgressBar = (segments: string[], overallProgress: number, targetScope: string) => {
    if (targetScope === 'weekly') {
      return (
        <HStack spacing={0} modifiers={[
          cornerRadius(4),
          frame({ height: 8 }),
          clipShape('capsule')
        ]}>
          {Array.from({ length: 20 }).map((_, i) => {
            const segmentValue = i * 5;
            const isFilled = segmentValue < overallProgress;
            return (
              <Rectangle
                key={i}
                modifiers={[
                  foregroundStyle(isFilled ? '#05D38E' : '#2A2D3A'),
                  opacity(isFilled ? 1.0 : 0.4),
                  frame({ height: 8 })
                ]}
              />
            );
          })}
        </HStack>
      );
    }
    return (
      <HStack spacing={6}>
        {(segments || ['future', 'future', 'future', 'future', 'future', 'future', 'future']).map((status, index) => {
          const isFuture = status === 'future';
          const baseColor = isFuture ? '#2A2D3A' : getSegmentColor(status);
          const segmentOpacity = isFuture ? 0.4 : 1.0;

          const mods = [
            foregroundStyle(baseColor),
            opacity(segmentOpacity),
            cornerRadius(4),
            frame({ height: 8 })
          ];

          if (!isFuture) {
            mods.push(shadow({ radius: 4, color: baseColor }));
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
  const family = context?.widgetFamily || context?.family || 'systemSmall';

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
    const statusColor = commitment.isBroken ? '#FF4655' : '#05D38E';
    const statusText = commitment.isBroken
      ? '⚠️ BROKEN'
      : (commitment.targetScope === 'weekly' ? '🛡️ SAFE' : '● ON TRACK');

    return (
      <Host>
        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[
            containerBackground('#0D0F18', 'widget'),
            padding({ all: 14 })
          ]}
        >
          {/* Header row: emoji + label ... ON TRACK + €amount */}
          <HStack spacing={4}>
            <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
              {emoji} {commitment.label}
            </Text>
            <Spacer />
            <Text modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundColor(statusColor),
              padding({ leading: 8, trailing: 8, top: 3, bottom: 3 }),
              background(commitment.isBroken ? '#1A0A0C' : '#0A1F15'),
              cornerRadius(6)
            ]}>
              {statusText}
            </Text>
            <Text modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundColor('#F5A623'),
              padding({ leading: 8, trailing: 8, top: 3, bottom: 3 }),
              background('#1F1A0A'),
              cornerRadius(6)
            ]}>
              €{commitment.stakeAmount}
            </Text>
          </HStack>

          {/* Subtitle: DAILY PLEDGE */}
          <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundColor('#8F93A3')]}>
            {commitment.targetScope === 'weekly' ? 'WEEKLY' : 'DAILY'} PLEDGE
          </Text>

          {/* Commitment sentence */}
          {commitment.sentence && (
            <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3'), lineLimit(2)]}>
              {commitment.sentence}
            </Text>
          )}

          <Spacer />

          {/* Progress bar - centered */}
          {renderSlicedProgressBar(commitment.segments, commitment.overallProgress, commitment.targetScope)}

          <Spacer />

          {/* Bottom stats */}
          <HStack alignment="bottom">
            <HStack spacing={3}>
              <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
                {commitment.overallProgress}%
              </Text>
              <Text modifiers={[font({ size: 9 }), foregroundColor('#8F93A3')]}>
                completed
              </Text>
            </HStack>
            <Spacer />
            {commitments.length > 1 ? (
              <Button target="next" modifiers={[buttonStyle('plain')]}>
                <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundColor('#8F93A3')]}>›</Text>
              </Button>
            ) : null}
          </HStack>
        </VStack>
      </Host>
    );
  }

  // --- MEDIUM WIDGET ---
  if (family === 'systemMedium') {
    const selectedIdx = props.selectedIndex || 0;
    const commitment = commitments[selectedIdx] || commitments[0];
    const emoji = getMetricEmoji(commitment.metricType);
    const statusColor = commitment.isBroken ? '#FF4655' : '#05D38E';
    const statusText = commitment.isBroken
      ? '⚠️ BROKEN'
      : (commitment.targetScope === 'weekly' ? '🛡️ SAFE' : '● ON TRACK');

    return (
      <Host>
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            containerBackground('#0D0F18', 'widget'),
            padding({ all: 16 })
          ]}
        >
          {/* Row 1: emoji + label ... ON TRACK pill + €amount pill */}
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
              {emoji} {commitment.label}
            </Text>
            <Spacer />
            <Text modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundColor(statusColor),
              padding({ leading: 10, trailing: 10, top: 4, bottom: 4 }),
              background(commitment.isBroken ? '#1A0A0C' : '#0A1F15'),
              cornerRadius(8)
            ]}>
              {statusText}
            </Text>
            <Text modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundColor('#F5A623'),
              padding({ leading: 10, trailing: 10, top: 4, bottom: 4 }),
              background('#1F1A0A'),
              cornerRadius(8)
            ]}>
              €{commitment.stakeAmount}
            </Text>
          </HStack>

          {/* Row 2: DAILY PLEDGE subtitle */}
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundColor('#8F93A3')]}>
            {commitment.targetScope === 'weekly' ? 'WEEKLY' : 'DAILY'} PLEDGE
          </Text>

          {/* Commitment sentence */}
          {commitment.sentence && (
            <Text modifiers={[font({ size: 11 }), foregroundColor('#8F93A3'), lineLimit(1)]}>
              {commitment.sentence}
            </Text>
          )}

          <Spacer />

          {/* Progress bar - centered vertically */}
          {renderSlicedProgressBar(commitment.segments, commitment.overallProgress, commitment.targetScope)}

          <Spacer />

          {/* Bottom stats row */}
          <HStack>
            <HStack spacing={4}>
              <Text modifiers={[font({ size: 28, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
                {commitment.overallProgress}%
              </Text>
              <Text modifiers={[font({ size: 11 }), foregroundColor('#8F93A3')]}>
                completed
              </Text>
            </HStack>
            <Spacer />
            <VStack alignment="trailing" spacing={1}>
              <Text modifiers={[font({ size: 8, weight: 'bold' }), foregroundColor('#8F93A3')]}>
                TARGET GOAL
              </Text>
              <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
                {commitment.targetValue.toLocaleString()} {commitment.unit}
              </Text>
            </VStack>
            <VStack alignment="trailing" spacing={1} modifiers={[padding({ leading: 12 })]}>
              <Text modifiers={[font({ size: 8, weight: 'bold' }), foregroundColor('#8F93A3')]}>
                REMAINING
              </Text>
              <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
                {commitment.remainingDays}
              </Text>
            </VStack>
            {commitments.length > 1 ? (
              <Button target="next" modifiers={[buttonStyle('plain'), padding({ leading: 8 })]}>
                <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundColor('#8F93A3')]}>›</Text>
              </Button>
            ) : null}
          </HStack>
        </VStack>
      </Host>
    );
  }

  // --- LARGE WIDGET ---
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
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundColor('#F5A623')]}>
            🔒 PLEDGED
          </Text>
        </HStack>

        <Spacer modifiers={[frame({ height: 2 })]} />

        {/* Commitments List */}
        {largeListItems.map((commitment, index) => {
          const emoji = getMetricEmoji(commitment.metricType);
          const statusColor = commitment.isBroken ? '#FF4655' : '#05D38E';
          const statusText = commitment.isBroken
            ? '⚠️ Broken'
            : (commitment.targetScope === 'weekly' ? '🛡️ Safe' : '● On Track');

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
                    <Text modifiers={[font({ size: 9 }), foregroundColor('#6B7280'), lineLimit(1)]}>
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
                    <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundColor('#F5A623')]}>
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
