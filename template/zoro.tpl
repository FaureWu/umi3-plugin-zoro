import React from 'react';
import { ApplyPluginsType } from 'umi';
import zoro from '@opcjs/zoro';
import { Provider } from "react-redux";
import { plugin } from '../core/umiExports';

let app = null;

function _onCreate() {
  if (app) return app

  const runtimeZoro = plugin.applyPlugins({
    key: 'zoro',
    type: ApplyPluginsType.modify,
    initialValue: {},
  });
  app = zoro({
    ...(runtimeZoro.config || {}),
  });
  (runtimeZoro.plugins || []).forEach(plugin => {
    app.use(plugin);
  });
  {{{ RegisterModels }}}
  const actions = runtimeZoro.intercept ? (runtimeZoro.intercept.actions || []) : []
  actions.forEach(action => {
    app.intercept.action(action)
  })
  const effects = runtimeZoro.intercept ? (runtimeZoro.intercept.effects || []) : []
  effects.forEach(effect => {
    app.intercept.effect(effect)
  })

  return app;
}

export function getApp() {
  return app;
}

_onCreate();
const store = app.start();

export function _ZoroContainer({ children }) {
  return React.createElement(Provider, { store }, children);
}
