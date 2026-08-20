/**
 * settings 模块私有 store。
 */

import { createStore } from '../../core/store.js';
import * as api from './api.js';

const initialState = {
  profile: null,
  display: null,
  database: null,
  sessionDuration: '8h',
  loading: false,
  error: '',
};

export const store = createStore(initialState);

export async function loadProfile() {
  const data = await api.getProfile();
  store.setState({ profile: data.profile || {} });
  return data.profile;
}

export async function loadDisplay() {
  const data = await api.getDisplay();
  store.setState({ display: data || {} });
  return data;
}

export async function loadDatabaseInfo() {
  const data = await api.getDatabaseInfo();
  store.setState({ database: data });
  return data;
}

export async function loadSessionDefault() {
  const data = await api.getSessionDuration();
  store.setState({ sessionDuration: data?.duration || '8h' });
  return data;
}