/********************************************************************************
  * Copyright (C) 2018 Ericsson and others.
  *
  * This program and the accompanying materials are made available under the
  * terms of the Eclipse Public License v. 2.0 which is available at
  * http://www.eclipse.org/legal/epl-2.0.
  *
  * This Source Code may also be made available under the following Secondary
  * Licenses when the conditions for such availability set forth in the Eclipse
  * Public License v. 2.0 are satisfied: GNU General Public License, version 2
  * with the GNU Classpath Exception which is available at
  * https://www.gnu.org/software/classpath/license.html.
  *
  * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
  ********************************************************************************/

import { injectable, inject } from "inversify";
import { QuickOpenService, QuickOpenModel, QuickOpenItem, QuickOpenMode } from "@theia/core/lib/browser/quick-open/";
import { WorkspaceService } from "./workspace-service";
import URI from "@theia/core/lib/common/uri";
import { MessageService } from "@theia/core/lib/common";

@injectable()
export class QuickOpenWorkspace implements QuickOpenModel {

    protected items: QuickOpenItem[];

    @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService;
    @inject(WorkspaceService) private readonly workspaceService: WorkspaceService;
    @inject(MessageService) private readonly messageService: MessageService;
    protected readonly workspaceRoot: string | undefined;

    open(workspaceRoots: string[]): void {
        this.items = [];
        for (const workspaceRoot of workspaceRoots) {
            this.items.push(new WorkspaceQuickOpenItem(this.workspaceService, workspaceRoot, this.messageService));
        }

        this.quickOpenService.open(this, {
            placeholder: 'Type the name of the workspace you want to open',
            fuzzyMatchLabel: true,
            fuzzySort: false
        });
    }

    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    // Command initiated from the menu
    select() {
        this.items = [];
        this.workspaceService.recentRoots().then(workspaceRoots => {
            if (workspaceRoots) {
                this.open(workspaceRoots);
            }
        });
    }
}

export class WorkspaceQuickOpenItem extends QuickOpenItem {

    constructor(
        @inject(WorkspaceService) private readonly workspaceService: WorkspaceService,
        protected readonly workspaceRoot: string | undefined,
        @inject(MessageService) private readonly messageService: MessageService
    ) {
        super();
    }

    getLabel(): string {
        if (this.workspaceRoot) {
            const last = this.workspaceRoot.lastIndexOf("/") + 1;
            return this.workspaceRoot.slice(last);
        }
        return "";
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.workspaceService.root.then(current => {
            if (current === undefined) {  // Available recent workspace(s) but closed
                if (this.workspaceRoot && this.workspaceRoot.length > 0) {
                    this.workspaceService.open(new URI(this.workspaceRoot));
                } else {
                    this.messageService.info(`Workspace is closed`);
                }
            } else {
                if (current.uri !== this.workspaceRoot) {
                    this.workspaceService.open(new URI(this.workspaceRoot));
                } else {
                    this.messageService.info(`Using the same workspace [ ${this.getLabel()} ]`);
                }

            }
        });
        return true;
    }
}
