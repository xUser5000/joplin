import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'toggleVisiblePanes',
	label: () => _('Toggle editor layout'),
	iconName: 'fa-columns',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'NOTE_VISIBLE_PANES_TOGGLE',
			});
		},
	};
};
