# Agent Note

费用胶囊通过 portal 挂载到宿主的 `[data-composer-stats]` 容器，以便和内置 Token 用量胶囊共享同一行的 flex 布局。宿主没有该容器时保留原插槽内容作为降级渲染；不要把这个选择器替换成依赖具体 DOM 层级的路径。
