import React from 'react';
import WeeklySheet from '../../components/WeeklySheet';
import { Page } from '../../components/ui';

export default function RepWeeklySheet() {
  return (
    <Page title="Weekly attendance sheet" subtitle="At the end of the week, download your class's sheet, print it, and take it to the lecturer or HOD to sign">
      <WeeklySheet basePath="/classrep" />
    </Page>
  );
}
