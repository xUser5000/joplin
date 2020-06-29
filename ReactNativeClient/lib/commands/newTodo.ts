import CommandService, { CommandDeclaration, CommandRuntime } from '../services/CommandService';
const { _ } = require('lib/locale');

const declaration:CommandDeclaration = {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
};

export default declaration;

export const runtime:CommandRuntime = {
	execute: async (template:string = null) => {
		return CommandService.instance().execute('newNote', template, true);
	},
	isEnabled: () => {
		return CommandService.instance().isEnabled('newNote');
	},
};
