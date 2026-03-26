import CarPlay

final class CarPlayManager {
  static let shared = CarPlayManager()

  private weak var interfaceController: CPInterfaceController?

  private init() {}

  func connect(interfaceController: CPInterfaceController) {
    self.interfaceController = interfaceController
    interfaceController.setRootTemplate(makeRootTemplate(), animated: true, completion: nil)
  }

  func disconnect() {
    interfaceController = nil
  }

  private func makeRootTemplate() -> CPTemplate {
    let readinessItem = CPListItem(
      text: "CarPlay foundation connected",
      detailText: "Native scene wiring is now in place for MyExplorer."
    )
    let statusItem = CPListItem(
      text: "Active trip sync",
      detailText: "Shared navigation session integration is the next step."
    )
    let policyItem = CPListItem(
      text: "Driver-safe scope",
      detailText: "Navigation-first templates will be enabled after entitlement approval."
    )

    let section = CPListSection(items: [readinessItem, statusItem, policyItem])
    return CPListTemplate(title: "MyExplorer", sections: [section])
  }
}
