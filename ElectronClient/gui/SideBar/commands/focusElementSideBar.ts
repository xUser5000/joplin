import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'focusElementSideBar',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ sidebarVisibility }:any) => {
			if (sidebarVisibility) {
				const item = comp.selectedItem();
				if (item) {
					const anchorRef = comp.anchorItemRefs[item.type][item.id];
					if (anchorRef) anchorRef.current.focus();
				} else {
					const anchorRef = comp.firstAnchorItemRef('folder');
					if (anchorRef) anchorRef.current.focus();
				}
			}
		},
		isEnabled: (props:any):boolean => {
			return props.sidebarVisibility;
		},
		mapStateToProps: (state:any):any => {
			return {
				sidebarVisibility: state.sidebarVisibility,
			};
		},
	};
};
