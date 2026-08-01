// Manual mock for lucide-react-native and all subpath imports
'use strict';

const handler = {
  get(target, prop) {
    if (prop === '__esModule') return true;
    const MockIcon = () => null;
    MockIcon.displayName = `MockIcon.${String(prop)}`;
    return MockIcon;
  },
};

module.exports = new Proxy({}, handler);
