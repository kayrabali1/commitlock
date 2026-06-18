import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HealthDataService } from '../../services/health';
import AndroidCommitmentsWidget from './AndroidCommitmentsWidget';

export async function androidWidgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction } = props;

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE') {
    try {
      const commitments = await HealthDataService.getActiveCommitments();
      const weeklyData: Record<string, any[]> = {};
      
      for (const commitment of commitments) {
        const data = await HealthDataService.fetchWeeklyData(commitment.metricType, commitment);
        weeklyData[commitment.id] = data;
      }
      
      props.renderWidget(
        <AndroidCommitmentsWidget 
          commitments={commitments} 
          weeklyData={weeklyData} 
        />
      );
    } catch (error) {
      console.error('Failed to update Android widget', error);
      // Render fallback empty state
      props.renderWidget(<AndroidCommitmentsWidget commitments={[]} weeklyData={{}} />);
    }
  }
}
