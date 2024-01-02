### 数据结构

scene.json 组成

```json
{
    "id": "0-1-2-12", // 码表值构成
    "path": ["上海", "杨高南路", "一号楼", "12层"],
    "size": [50, 50, 4], // 单位为米
    "objects": [], 
    "templates": []
}
```

为了统一表示，宽/width 对应 x 轴长度，高/height 高对应 y 轴长度，深/depth 对应 z 轴高度，这个是参照 BoxGeometry 的定义来。

#### MetaObject

objects 和 templates 都是 MetaObject，用于构建实际的 three.js 的 Object3D 模型，作为 meta 字段存储

```js
{
    // template 模板
    "tid": "NormalSeat", // 模板编号
    "name": "正常工位", // 模板名词
    // 2d
    "model2d": "", // 模型为box
    "size": [2, 1, 1], // 宽、高、深
    "color": "", // 物体颜色
    "text": "A-111",
    // 3d
    "model3d": "", // 当使用3D显示时，使用的模型文件
    "scale": 1.0, // 模型的缩放比例
    // metaobject 独有字段
    "id": "100", // 物体的唯一标志
    "position": [8, 31, 1], // x、y、z（左下角）
}
```

不存在的字段会从 Template 里取。

### 模式

两种模式:编辑模式和立体展示

#### 编辑模式

编辑模式为只显示 Box（未来支持显示文字）

#### 3D模式

显示 model