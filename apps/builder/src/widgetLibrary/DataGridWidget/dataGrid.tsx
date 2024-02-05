import { StyledEngineProvider, ThemeProvider, createTheme } from "@mui/material"
import {
  DataGridPremium,
  GridAggregationModel,
  GridColDef,
} from "@mui/x-data-grid-premium"
import { GridApiPremium } from "@mui/x-data-grid-premium/models/gridApiPremium"
import { get, isArray, isNumber, isPlainObject } from "lodash-es"
import {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useDispatch } from "react-redux"
import { getColor } from "@illa-design/react"
import { dealRawData2ArrayData } from "@/page/App/components/InspectPanel/PanelSetters/DataGridSetter/utils"
import { configActions } from "@/redux/config/configSlice"
import {
  getColumnFromType,
  getColumnTypeFromValue,
  getSafeColumn,
} from "@/widgetLibrary/DataGridWidget/columnDeal"
import { Toolbar } from "./Toolbar"
import { UNIQUE_ID_NAME } from "./constants"
import { BaseDataGridProps } from "./interface"

export const DataGridWidget: FC<BaseDataGridProps> = (props) => {
  const {
    loading,
    triggerEventHandler,
    dataSource,
    dataSourceJS,
    dataSourceMode,
    sortKey,
    sortOrder,
    handleUpdateMultiExecutionResult,
    displayName,
    rowSelection,
    rowSelectionMode,
    pageSize,
    page,
    pageSizeOptions,
    columnSetting,
    densitySetting,
    refreshSetting,
    quickFilterSetting,
    exportSetting,
    exportAllSetting,
    filterSetting,
    enableServerSidePagination,
    totalRowCount,
    primaryKey,
    filterModel,
    selectedRowsPrimaryKeys,
    excludeHiddenColumns,
    columnVisibilityModel,
    updateComponentRuntimeProps,
    deleteComponentRuntimeProps,
    columns,
    enablePagination,
  } = props

  const rawData = dataSourceMode === "dynamic" ? dataSourceJS : dataSource
  const serverSideOffset = (page ?? 0) * (pageSize ?? 10)

  const arrayData: object[] = useMemo(
    () =>
      dealRawData2ArrayData(
        rawData,
        enableServerSidePagination,
        serverSideOffset,
      ),
    [rawData, enableServerSidePagination, serverSideOffset],
  )

  const ref = useRef<GridApiPremium>(null) as MutableRefObject<GridApiPremium>

  const dispatch = useDispatch()

  const handleAggregationModelChange = (modal: GridAggregationModel) => {
    if (!columns || !Array.isArray(columns)) return
    let curColumns = [...(columns || [])]
    Object.keys(modal).forEach((key) => {
      const index = columns.findIndex((column) => {
        return column?.field === key
      })
      if (!columns || index === -1) return
      curColumns = [
        ...curColumns.slice(0, index),
        {
          ...columns[index],
          aggregationModel: modal[key],
        },
        ...curColumns.slice(index + 1),
      ]
    })

    handleUpdateMultiExecutionResult([
      {
        displayName,
        value: {
          columns: curColumns,
        },
      },
    ])
  }

  const isInnerDragging = useRef(false)

  const toolbar = useCallback(
    () => (
      <Toolbar
        columnSetting={columnSetting}
        densitySetting={densitySetting}
        exportSetting={exportSetting}
        exportAllSetting={exportAllSetting}
        filterSetting={filterSetting}
        quickFilterSetting={quickFilterSetting}
        refreshSetting={refreshSetting}
        onRefresh={() => {
          triggerEventHandler("onRefresh")
        }}
      />
    ),
    [
      columnSetting,
      densitySetting,
      exportAllSetting,
      exportSetting,
      filterSetting,
      quickFilterSetting,
      refreshSetting,
      triggerEventHandler,
    ],
  )

  useEffect(() => {
    updateComponentRuntimeProps({
      refresh: () => {
        triggerEventHandler("onRefresh")
      },
      setFilterModel: (model: unknown) => {
        if (
          isPlainObject(model) &&
          (model as Record<string, unknown>).hasOwnProperty("items") &&
          Array.isArray((model as Record<string, unknown>).items)
        ) {
          handleUpdateMultiExecutionResult([
            {
              displayName,
              value: {
                filterModel: model,
              },
            },
          ])
          triggerEventHandler("onFilterModelChange")
        }
      },
      setColumnVisibilityModel: (model: unknown) => {
        if (isPlainObject(model)) {
          handleUpdateMultiExecutionResult([
            {
              displayName,
              value: {
                columnVisibilityModel: model,
              },
            },
          ])
          triggerEventHandler("onColumnVisibilityModelChange")
        }
      },
      setPage: (page: unknown) => {
        if (isNumber(page)) {
          handleUpdateMultiExecutionResult([
            {
              displayName,
              value: {
                page,
              },
            },
          ])
          triggerEventHandler("onPaginationModelChange")
        }
      },
      setPageSize: (pageSize: unknown) => {
        if (isNumber(pageSize)) {
          handleUpdateMultiExecutionResult([
            {
              displayName,
              value: {
                pageSize,
              },
            },
          ])
          triggerEventHandler("onPaginationModelChange")
        }
      },
      setRowSelection: (rows: unknown) => {
        if (isArray(rows) && rows.every((row) => !isNaN(row))) {
          handleUpdateMultiExecutionResult([
            {
              displayName,
              value: {
                selectedRowsPrimaryKeys: rows,
                selectedRows: rows.map((id) =>
                  ref.current.getRowModels().get(id),
                ),
              },
            },
          ])
          triggerEventHandler("onRowSelectionModelChange")
        }
      },
    })
    return () => {
      deleteComponentRuntimeProps()
    }
  }, [
    updateComponentRuntimeProps,
    deleteComponentRuntimeProps,
    triggerEventHandler,
    handleUpdateMultiExecutionResult,
    displayName,
  ])

  const renderColumns = useMemo(() => {
    if (!columns) return []
    return columns.map((column) => {
      const safeColumn = getSafeColumn(column)
      return safeColumn.columnType === "auto"
        ? getColumnFromType(
            {
              ...safeColumn,
              columnType: getColumnTypeFromValue(
                get(arrayData[0], safeColumn.field),
              ),
            },
            triggerEventHandler,
          )
        : getColumnFromType(safeColumn, triggerEventHandler)
    })
  }, [arrayData, columns, triggerEventHandler])

  const aggregationModel = useMemo(() => {
    const curAggregationModel: GridAggregationModel = {}
    columns?.forEach((column) => {
      if (column?.aggregationModel) {
        curAggregationModel[column.field] = column.aggregationModel
      }
    })
    return curAggregationModel
  }, [columns])

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider
        theme={createTheme({
          palette: {
            primary: { main: getColor("blue", "03") },
          },
        })}
      >
        <DataGridPremium
          key={displayName + ":" + primaryKey}
          apiRef={ref}
          getRowId={(row) => {
            if (
              primaryKey === undefined ||
              primaryKey === "—" ||
              !(primaryKey in row)
            ) {
              return get(row, UNIQUE_ID_NAME)
            } else {
              return get(row, primaryKey)
            }
          }}
          aggregationModel={aggregationModel}
          onAggregationModelChange={handleAggregationModelChange}
          filterModel={
            filterModel !== undefined
              ? {
                  ...filterModel,
                  quickFilterExcludeHiddenColumns:
                    filterModel.quickFilterExcludeHiddenColumns ??
                    excludeHiddenColumns,
                }
              : undefined
          }
          onFilterModelChange={(model) => {
            handleUpdateMultiExecutionResult([
              {
                displayName,
                value: {
                  filterModel: model,
                },
              },
            ])
            triggerEventHandler("onFilterModelChange")
          }}
          rowSelectionModel={rowSelection ? selectedRowsPrimaryKeys : undefined}
          rowSelection={rowSelection}
          onColumnVisibilityModelChange={(model) => {
            handleUpdateMultiExecutionResult([
              {
                displayName,
                value: {
                  columnVisibilityModel: model,
                },
              },
            ])
            triggerEventHandler("onColumnVisibilityModelChange")
          }}
          columnVisibilityModel={{
            [UNIQUE_ID_NAME]: false,
            ...columnVisibilityModel,
          }}
          onRowSelectionModelChange={(model) => {
            handleUpdateMultiExecutionResult([
              {
                displayName,
                value: {
                  selectedRowsPrimaryKeys: model,
                  selectedRows: model.map((id) =>
                    ref.current.getRowModels().get(id),
                  ),
                },
              },
            ])
            triggerEventHandler("onRowSelectionModelChange")
          }}
          sortModel={
            sortKey != undefined && sortOrder != undefined
              ? [
                  {
                    field: sortKey,
                    sort: sortOrder === "default" ? null : sortOrder,
                  },
                ]
              : []
          }
          pagination={enablePagination}
          pageSizeOptions={isArray(pageSizeOptions) ? pageSizeOptions : []}
          autoPageSize={pageSize === undefined}
          paginationModel={
            pageSize !== undefined
              ? {
                  pageSize: pageSize ?? 0,
                  page: page ?? 0,
                }
              : undefined
          }
          onPaginationModelChange={(model) => {
            handleUpdateMultiExecutionResult([
              {
                displayName,
                value: {
                  page: model.page,
                  pageSize: model.pageSize,
                },
              },
            ])
            triggerEventHandler("onPaginationModelChange")
          }}
          onSortModelChange={(model) => {
            if (model.length > 0) {
              handleUpdateMultiExecutionResult([
                {
                  displayName,
                  value: {
                    sortKey: model[0].field,
                    sortOrder: model[0].sort,
                  },
                },
              ])
            } else {
              handleUpdateMultiExecutionResult([
                {
                  displayName,
                  value: {
                    sortKey: undefined,
                    sortOrder: undefined,
                  },
                },
              ])
            }
            triggerEventHandler("onSortModelChange")
          }}
          disableMultipleRowSelection={
            rowSelectionMode === "single" || !rowSelection
          }
          checkboxSelection={rowSelection && rowSelectionMode === "multiple"}
          rows={arrayData}
          columns={(renderColumns as GridColDef[]) ?? []}
          paginationMode={
            enablePagination
              ? enableServerSidePagination
                ? "server"
                : "client"
              : undefined
          }
          rowCount={
            enablePagination && enableServerSidePagination && totalRowCount
              ? totalRowCount
              : arrayData.length
          }
          keepNonExistentRowsSelected={enableServerSidePagination}
          loading={loading}
          slots={{
            toolbar: toolbar,
          }}
          onColumnHeaderEnter={() => {
            dispatch(
              configActions.setResizingNodeIDsReducer([
                `${displayName}-column-header-resize`,
              ]),
            )
            isInnerDragging.current = true
          }}
          onColumnHeaderLeave={() => {
            dispatch(configActions.setResizingNodeIDsReducer([]))
            isInnerDragging.current = false
          }}
        />
      </ThemeProvider>
    </StyledEngineProvider>
  )
}

DataGridWidget.displayName = "DataGridWidget"
export default DataGridWidget
