import React from 'react';
import { _ZoroContainer } from './zoro';

export function rootContainer(container) {
  return React.createElement(_ZoroContainer, null, container);
}