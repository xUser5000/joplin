import * as React from 'react';
import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'toggleNoteList',
	label: () => _('Toggle note list'),
	iconName: 'fa-align-justify',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ message }:any) => {
			comp.setState({
				modalLayer: {
					visible: true,
					message:
						<div className="modal-message">
							<div id="loading-animation" />
							<div className="text">{message}</div>
						</div>,
				},
			});
		},
	};
};
