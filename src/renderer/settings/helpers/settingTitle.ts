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
export const settingTitle = setting => titleize(humanise(setting.key))