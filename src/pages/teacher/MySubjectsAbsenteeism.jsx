import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async } from '../../components/ui';
import TopicAbsenteeism from '../../components/Analytics/TopicAbsenteeism';

export default function MySubjectsAbsenteeism() {
  const state = useFetch('/teacher/absenteeism');
  return (
    <Page title="Absenteeism by unit" subtitle="Students attending fewer than 75% of your sessions">
      <Async state={state}>
        {(units) => <TopicAbsenteeism units={units} />}
      </Async>
    </Page>
  );
}
