import { Host, VStack, HStack, Text, Spacer } from '@expo/ui/swift-ui';
import { 
  background, 
  foregroundColor, 
  font, 
  cornerRadius, 
  padding 
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
  segments: ('future' | 'success' | 'failed' | 'today')[];
}

export type WidgetProps = {
  commitments: CommitmentWidgetData[];
};

// Widget environment context
export type WidgetEnvironment = {
  family: 'systemSmall' | 'systemMedium' | 'systemLarge';
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

const getSegmentColor = (status: 'future' | 'success' | 'failed' | 'today') => {
  switch (status) {
    case 'success': return '#05D38E';
    case 'failed': return '#FF4655';
    case 'today': return '#7C3AED'; // Indigo/Purple accent for today
    default: return '#1E293B'; // Future
  }
};

// Sliced progress bar component
function SlicedProgressBar({ segments }: { segments: ('future' | 'success' | 'failed' | 'today')[] }) {
  return (
    <HStack spacing={4}>
      {(segments || ['future', 'future', 'future', 'future', 'future', 'future', 'future']).map((status, index) => (
        <Spacer
          key={index}
          modifiers={[
            background(getSegmentColor(status)),
            cornerRadius(2),
            padding({ top: 4, bottom: 4 }) // Give it thickness
          ]}
        />
      ))}
    </HStack>
  );
}

export default function CommitmentsProgressWidget(props: WidgetProps, context: any) {
  'widget';

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
            background('#06070B'),
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
    const commitment = commitments[0];
    const emoji = getMetricEmoji(commitment.metricType);

    return (
      <Host>
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            background('#06070B'),
            padding({ all: 16 })
          ]}
        >
          {/* Header row */}
          <HStack spacing={4}>
            <Text modifiers={[font({ size: 14 }), foregroundColor('#FFFFFF')]}>
              {emoji} {commitment.label}
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundColor('#7C3AED')]}>
              €{commitment.stakeAmount}
            </Text>
          </HStack>

          <Spacer />

          {/* Progress Section */}
          <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundColor('#FFFFFF')]}>
            {commitment.overallProgress}%
          </Text>

          <Text modifiers={[font({ size: 11 }), foregroundColor(commitment.isBroken ? '#FF4655' : '#8F93A3')]}>
            {commitment.isBroken ? '⚠️ Broken' : `${commitment.remainingDays} left`}
          </Text>

          <Spacer />

          {/* Sliced Progress Bar */}
          <SlicedProgressBar segments={commitment.segments} />
        </VStack>
      </Host>
    );
  }

  // --- MEDIUM WIDGET ---
  // Show up to 2 active commitments in a vertical list
  const listItems = commitments.slice(0, 2);

  return (
    <Host>
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[
          background('#06070B'),
          padding({ all: 16 })
        ]}
      >
        {/* Header Title */}
        <HStack>
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundColor('#8F93A3')]}>
            HABITCONTRACT ACTIVE PROGRESS
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 11 }), foregroundColor('#4F46E5')]}>
            🔒 PLEDGED
          </Text>
        </HStack>

        {/* Commitments List */}
        {listItems.map((commitment, index) => {
          const emoji = getMetricEmoji(commitment.metricType);
          return (
            <VStack key={commitment.id || index} alignment="leading" spacing={4}>
              <HStack spacing={4}>
                <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundColor('#FFFFFF')]}>
                  {emoji} {commitment.label} ({commitment.overallProgress}%)
                </Text>
                <Spacer />
                <Text modifiers={[font({ size: 12 }), foregroundColor(commitment.isBroken ? '#FF4655' : '#05D38E')]}>
                  {commitment.isBroken ? '⚠️ Broken' : `€${commitment.stakeAmount} Pledged`}
                </Text>
              </HStack>

              {/* Sliced Progress Bar */}
              <SlicedProgressBar segments={commitment.segments} />

              <HStack>
                <Text modifiers={[font({ size: 10 }), foregroundColor('#8F93A3')]}>
                  {commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} Target • {commitment.targetValue} {commitment.unit}
                </Text>
                <Spacer />
                <Text modifiers={[font({ size: 10 }), foregroundColor('#8F93A3')]}>
                  {commitment.remainingDays} left
                </Text>
              </HStack>
            </VStack>
          );
        })}
      </VStack>
    </Host>
  );
}
