# The Motion Workshop ? Caloocan Stake YSA Gathering

Open `index.html` directly or use VS Code Live Server. No install, build, API keys, backend, or database is needed. All illustrations are local SVGs.

Select any floor to expand its classroom inside the building. Use Back to Building or Escape to close it. Floor 3 has a four-step tutorial, floor 4 a replayable mechanism demonstration, and floor 5 a resettable simulated race. Race distances are demonstration values only.

For GitHub Pages, publish the contents of this directory as the site root (or visit `/YSA-Gathering/ysa-straw-car/` if publishing the entire parent repository). All paths are relative.

The interface supports keyboard navigation, narrow screens, and reduced motion preferences.

## Reference redesign
The building now uses a locally generated photographic architectural backdrop with five real HTML floor buttons. Tutorial photos use a local six-panel image sheet. On desktop, lessons expand inside the right facade. On mobile, readable lessons open beneath the building. Asset provenance is in `assets/images/GENERATION.md`.

## Enter the building
Start outside and select **Open Building** to enter the animated interior. Choose one of five room doors to view instructions. **Back to Rooms** closes the lesson; **Exit Building** returns outside. Escape first closes a lesson, then exits. Outside room controls are inert and hidden. Reduced motion skips the camera animation.

## True 3D interior

The interior now uses a dependency-free WebGL renderer in `js/world.js`, with actual 3D meshes, perspective depth, lighting, storefront portals, furniture, plants, and a moving camera. No CDN or package installation is needed.

- Open Building: travel into the arcade.
- Walk: hold W/S, up/down arrow keys, or the on-screen arrow buttons.
- Select a storefront: the camera approaches the doorway, enters the workshop, and turns to its instruction wall. The readable HTML lesson appears after arrival, retaining tutorial and simulation controls.
- Back to Rooms: walk back through the doorway to the hallway.
- Exit Building: return outside. Escape closes the lesson first, then exits.
- Reduced motion skips camera travel. Devices without WebGL retain accessible room buttons and instructions.

Validation: JavaScript syntax, finite mesh geometry, perspective projection, five room camera routes, walking bounds, and exit/re-entry were checked programmatically. GPU rendering and visual browser QA remain unverified because no connected browser was available.

## Straw car displays
The exterior now has a compact **Open Door** button directly under the welcome lettering. The interior contains five colored 3D three-wheel straw cars on lit display plinths. Select the car model itself or its display label to enter its associated lesson (introduction, materials, construction, mechanism, or testing). These are five lesson displays of the same three-wheel car activity.

## Sixth room: Straw Car Gallery
Room 06 is an additional gallery, preserving all five original instruction rooms. Enter the sixth storefront on the right at the far end of the hallway. It contains five 3D car exhibits and five selectable illustrated color variations with a larger detail view.

## Mouse look and 3D gallery
Drag the mouse or swipe the canvas to look left/right and up/down in the hallway and Room 06. A/D or left/right arrows also turn the view. Room signs remain anchored at their doors in world space. In Room 06, select one of five cars from the compact bottom controls to approach its real 3D exhibit, then drag to orbit it. Gallery overview restores the room view. The original five lesson rooms retain their instruction panels.

## Current mouse controls
Room plaques now use exact perspective projection of fixed wall corners. Hallway car stands have been removed; the five car exhibits remain exclusively inside Room 06. Click a floor spot to walk toward it; drag to look around. Forward/back buttons have been removed. Clicks above the floor move a short distance in that direction, constrained to the current hallway or gallery.

## Entrance and gallery layout
Room 06 now has its own entrance on the LEFT near the building entrance (x=-4, z=5), separate from Room 05 at the rear. Five gallery exhibits are inside that dedicated left room. The entrance has two hinged 3D door leaves that open before the camera crosses the threshold and remain visible from inside. Interior additions include planters, warm pendant fittings and seating. The right entrance wall displays: "Strengthened Together, Moving Forward in Faith" / Ecclesiastes 4:9.

## Glass entrance and varied gallery models
The entrance doors use alpha-blended glass with metal frames and handles. Turn toward the entrance from inside to see the door-mounted Exit Building control; selecting it animates the camera back outside. The activity theme remains projected onto the right wall mounting board. Gallery designs now have actual wheel counts of 3, 4, 3, 4 and 4: Classic Trike, Cross-Brace Racer, Delta Trike, Roll-Cage Buggy and Twin-Balloon Cruiser. Matching fallback illustrations are local SVGs.

Interior material realism: local photographic-style texture atlas for stone, walnut, fabric and brushed metal, with restrained surface highlights and ceiling-strip reflections. Use Live Server for WebGL image textures. Direct-file mode falls back to built-in finishes if the browser restricts local texture uploads. Visual GPU verification remains pending.
