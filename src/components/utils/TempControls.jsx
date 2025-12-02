<div className="flex items-center gap-1 flex-wrap">
              {access !== "staff" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="Actions">
                      <MoreVertical className="w-4 h-4" />
                      <span className="text-xs font-medium">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="themed">
                    <DropdownMenuItem
                      onClick={() => window.location.href = createPageUrl("TabularRoster?start=" + format(gridStart, "yyyy-MM-dd") + "&end=" + format(gridEnd, "yyyy-MM-dd") + (selectedDeptForDialog !== "" ? "&department=" + encodeURIComponent(selectedDeptForDialog) : ""))}
                      disabled={!canManage}>
                      Open grid editor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportGridTemplate} disabled={!canManage}>
                      Export grid template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowGridReplicaImport(true)} disabled={published || !canManage}>
                      Upload grid template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowExport(true)} disabled={!canManage}>
                      Export month…
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={published}>
                      Duplicate month…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowReset(true)}
                      disabled={!canManage}
                      className="text-red-600">
                      Hard reset…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (confirm("Run cleanup? This will remove all 'invisible' or garbage shifts that may have been imported incorrectly.")) {
                          const res = await base44.functions.invoke("cleanShifts");
                          alert(`Cleanup complete.\nDeleted ${res.data.deleted} bad records.`);
                          window.location.reload();
                        }
                      }}
                      disabled={!canManage}
                      className="text-amber-600">
                      Cleanup bad data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="Add">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-medium">Add</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="themed">
                    <DropdownMenuItem
                      onClick={() => {
                        if (selectedDeptForDialog === "") {
                          alert("Select a department first");
                        } else {
                          setShowAddStaff(true);
                        }
                      }}
                      disabled={selectedDeptForDialog === ""}>
                      Add employee
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={published}>
                      New shift…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowImport(true)} disabled={published}>
                      Import (row-based)…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {canManage && (
                <>
                  <Button
                    onClick={togglePublish}
                    size="sm"
                    className={`${published ? "bg-slate-900 hover:bg-slate-800" : "bg-sky-600 hover:bg-sky-700"} h-8 gap-1 px-2 text-white`}
                    title={published ? "Published" : "Publish"}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{published ? "Published" : "Publish"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 themed"
                    onClick={() => setShowSnapshot(true)}
                    title="Snapshots">
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Snapshot</span>
                  </Button>
                </>
              )}

              {access !== "staff" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 themed"
                  onClick={handleReset}
                  title="Reset view">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Reset</span>
                </Button>
              )}
            </div>