import CommandService, { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (template:string = null) => {
			return CommandService.instance().execute('newNote', template, true);
		},
		isEnabled: () => {
			return CommandService.instance().isEnabled('newNote');
		},
	};
};
