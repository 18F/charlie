const interactive = Symbol("interactive");
const noninteractive = Symbol("non-interactive");

const modules = new Map([
  [interactive, []],
  [noninteractive, []],
]);

module.exports = {
  getHelp() {
    return modules;
  },

  registerInteractive(name, trigger, helpText, directMention = false) {
    modules.get(interactive).push({ name, trigger, helpText, directMention });
  },

  registerNonInteractive(name, helpText) {
    modules.get(noninteractive).push({ name, helpText });
  },

  type: {
    interactive,
    noninteractive,
  },
};
