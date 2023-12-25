### 数据结构

data.json 组成

```json
{
    "city": "上海", "zone": "杨高南路", "floor": "12层",
    "width": 100, "height": 100,
    "objects": [], "templates": {}
}
```

为了统一表示，宽/width 对应 x 轴长度，高/height 高对应 y 轴长度，深/depth 对应 z 轴高度，这个是参照 BoxGeometry 的定义来。

#### Template

template 为 Object 的模板，定义这一个楼层使用一些模板物体。

```js
{
    "category": "Seat", // 模板类别
    "tid": "NormalSeat", // 模板编号
    "name": "正常工位", // 模板名称
    "size": [2, 1, 1], // 宽、高、深
    "color": "", // 物体颜色
    "text": "A-111", // 物体标签
    "model": "", // 当使用3D显示时，使用的模型文件
    "scale": 1.0 // 模型文件的缩放比例
}
```

#### Object3D

Object3D 是 three.js 实际交互的物体对象，包含 Mesh、Group 等类型

#### Object

Object 为 Template 的扩展实例，主要是添加了 id 和 position，用于生成实际展示的 Object3D 对象，数据会保存到 Object3D 的 meta 字段里：

```js
{
    "id": "100", // 物体的唯一标志
    "position": [8, 31, 1], // x、y、z（左下角）
    "tid": "NormalSeat", // 模板编号
    "name": "正常工位", // 模板名词
    // 平面展示的物体
    "size": [2, 1, 1], // 宽、高、深
    "color": "", // 物体颜色
    "text": "A-111",
    // 当使用3D显示时，使用的模型文件
    "model": "",
    // 模型的缩放比例
    "scale": 1.0
}
```

不存在的字段会从 Template 里取。

### 视图模式

三种视图模式:编辑模式、平面预览和立体展示

#### 编辑模式

编辑模式为只显示 Box

#### 2D模式

显示 Box + 文字

#### 3D模式

显示 model