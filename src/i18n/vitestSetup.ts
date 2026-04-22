import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import i18n from './index';

void i18n.changeLanguage('en');

afterEach(() => {
  cleanup();
});
