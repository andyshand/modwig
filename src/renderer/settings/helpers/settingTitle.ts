import titleize from "titleizejs"

export const humanise = (value) => {
    const camelMatch = /([A-Z0-9])/g;
    const underscoreDashMatch = /[_-]/g;
  
    const camelCaseToSpaces = value.replace(camelMatch, " $1");
    const underscoresToSpaces = camelCaseToSpaces.replace(underscoreDashMatch, " ");
    const caseCorrected =
      underscoresToSpaces.charAt(0).toUpperCase() +
      underscoresToSpaces.slice(1).toLowerCase();
  
    return caseCorrected;
};
export const settingTitle = setting => {
  return setting.name || titleize(humanise(setting.key))
}

export const settingShortDescription = setting => {
  if (typeof setting.description !== 'string') {
    return 'No description available.'
  }
  return setting.description.split('.')[0].trim() + '.'
}

export const shortcutToTextDescription = (setting) => {
  const { value } = setting
  if ((value.keys || []).length === 0) {
      return ''
  }
  const mac = process.platform === 'darwin'
  return (value.keys || []).sort((a, b) => {
    return b - a
  }).map(key => {
      if (key === 'Meta' && mac) {
          return '⌘'
      } else if (key === 'Meta' && !mac) {
        return '⊞'
      } else if (key === 'Control') {
          return '⌃'
      } else if (key === 'Alt') {
          return '⌥'
      } else if (key === 'Shift') {
          return '⇧'
      }
      return {
        'ArrowUp': '↑',
        'ArrowRight': '→',
        'ArrowDown': '↓',
        'ArrowLeft': '←',
        'Escape': '⎋',
        'Space': '⎵',
        'Enter': '↵'
      }[key] || key
  }).join('')
}